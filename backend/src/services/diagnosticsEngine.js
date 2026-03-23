const prisma = require('../lib/prisma');
const { cacheGet, cacheSet } = require('../lib/redis');
const GitHubClient = require('./githubClient');

const STALE_DAYS = 7;
const CACHE_TTL = 300; // 5 minutes

/**
 * Run full diagnostics for a repo+branch and store a snapshot.
 * @param {object} repo - Repository record from DB
 * @param {string} token - GitHub access token
 */
async function runDiagnostics(repo, token) {
  const { owner, repoName, defaultBranch, id: repositoryId } = repo;
  const gh = new GitHubClient(token);

  const results = {
    commitsAhead: 0,
    commitsBehind: 0,
    conflictRiskScore: 0,
    conflictFiles: [],
    staleBranches: [],
    lastPushedAt: null,
    lastPulledAt: null,
  };

  try {
    // 1. Branch divergence (compare feature branch vs default)
    const branches = await gh.listBranches(owner, repoName);
    const activeBranches = branches.filter((b) => b.name !== defaultBranch);

    // Calculate staleness
    const staleCutoff = new Date();
    staleCutoff.setDate(staleCutoff.getDate() - STALE_DAYS);

    for (const branch of activeBranches) {
      try {
        const comparison = await gh.compareBranches(owner, repoName, defaultBranch, branch.name);
        results.commitsAhead = Math.max(results.commitsAhead, comparison.ahead_by || 0);
        results.commitsBehind = Math.max(results.commitsBehind, comparison.behind_by || 0);
      } catch {
        // skip uncomparable branches
      }
    }

    // 2. Conflict risk — find files changed in multiple branches in last 48hrs
    const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const fileEditCount = {};

    for (const branch of activeBranches.slice(0, 5)) {
      try {
        const commits = await gh.getCommits(owner, repoName, branch.name, since48h);
        for (const commit of commits) {
          for (const file of commit.files || []) {
            fileEditCount[file.filename] = (fileEditCount[file.filename] || 0) + 1;
          }
        }
      } catch {
        // skip
      }
    }

    const totalEdits = Object.values(fileEditCount).reduce((a, b) => a + b, 0) || 1;
    const highRiskFiles = Object.entries(fileEditCount)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([file, count]) => ({ file, editCount: count }));

    results.conflictFiles = highRiskFiles.slice(0, 10);
    results.conflictRiskScore = Math.min(
      100,
      Math.round((highRiskFiles.length / Math.max(1, Object.keys(fileEditCount).length)) * 100)
    );

    // 3. Stale branches
    for (const branch of activeBranches) {
      try {
        const commits = await gh.getCommits(owner, repoName, branch.name);
        const lastCommitDate = commits[0]?.commit?.committer?.date;
        if (lastCommitDate && new Date(lastCommitDate) < staleCutoff) {
          results.staleBranches.push({
            name: branch.name,
            lastCommitAt: lastCommitDate,
          });
        }
      } catch {
        // skip
      }
    }

  } catch (err) {
    console.error(`[DiagnosticsEngine] Error for ${owner}/${repoName}:`, err.message);
  }

  // Store snapshot
  try {
    await prisma.diagnosticsSnapshot.create({
      data: {
        repositoryId,
        branch: defaultBranch,
        commitsAhead: results.commitsAhead,
        commitsBehind: results.commitsBehind,
        conflictRiskScore: results.conflictRiskScore,
        conflictFiles: results.conflictFiles,
        staleBranches: results.staleBranches,
        lastPushedAt: results.lastPushedAt,
        lastPulledAt: results.lastPulledAt,
      },
    });
  } catch (err) {
    console.error('[DiagnosticsEngine] DB write error:', err.message);
  }

  // Cache result
  const cacheKey = `diag:${owner}:${repoName}:${defaultBranch}`;
  await cacheSet(cacheKey, results, CACHE_TTL);

  return results;
}

/**
 * Get latest diagnostics snapshot for a repo+branch (from cache or DB)
 */
async function getLatestSnapshot(owner, repoName, branch) {
  const cacheKey = `diag:${owner}:${repoName}:${branch}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const snapshot = await prisma.diagnosticsSnapshot.findFirst({
    where: {
      repository: { owner, repoName },
      branch,
    },
    orderBy: { snapshotAt: 'desc' },
  });

  return snapshot;
}

/**
 * Run diagnostics for all active repositories
 */
async function runAllDiagnostics() {
  const repos = await prisma.repository.findMany({
    where: { isActive: true },
    include: { user: true },
  });

  console.log(`[DiagnosticsEngine] Running diagnostics for ${repos.length} repos...`);

  for (const repo of repos) {
    if (!repo.user?.githubToken) continue;
    try {
      await runDiagnostics(repo, repo.user.githubToken);
    } catch (err) {
      console.error(`[DiagnosticsEngine] Failed for ${repo.owner}/${repo.repoName}:`, err.message);
    }
  }
}

module.exports = { runDiagnostics, getLatestSnapshot, runAllDiagnostics };
