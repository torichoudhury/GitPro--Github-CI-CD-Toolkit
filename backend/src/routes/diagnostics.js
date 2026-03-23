const express = require('express');
const router = express.Router();
const { getLatestSnapshot, runDiagnostics } = require('../services/diagnosticsEngine');
const prisma = require('../lib/prisma');
const GitHubClient = require('../services/githubClient');

async function getRepo(owner, repoName) {
  return prisma.repository.findFirst({
    where: { owner, repoName, isActive: true },
    include: { user: true },
  });
}

// GET /api/diagnostics/:owner/:repo/:branch
router.get('/:owner/:repo/:branch', async (req, res) => {
  try {
    const { owner, repo, branch } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const snapshot = await getLatestSnapshot(owner, repo, branch);

    if (!snapshot) {
      // Trigger a fresh one
      const dbRepo = await getRepo(owner, repo);
      if (dbRepo) {
        const result = await runDiagnostics(dbRepo, token);
        return res.json(result);
      }
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Determine risk level
    const behind = snapshot.commitsBehind || 0;
    const riskLevel = behind === 0 ? 'green' : behind <= 5 ? 'yellow' : 'red';

    res.json({
      ...snapshot,
      riskLevel,
      conflicts: snapshot.conflictFiles || [],
      staleBranches: snapshot.staleBranches || [],
    });
  } catch (err) {
    console.error('[Diagnostics] GET /:branch:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/diagnostics/:owner/:repo/conflicts
router.get('/:owner/:repo/conflicts', async (req, res) => {
  try {
    const { owner, repo } = req.params;

    const snapshot = await prisma.diagnosticsSnapshot.findFirst({
      where: { repository: { owner, repoName: repo } },
      orderBy: { snapshotAt: 'desc' },
    });

    res.json({
      conflictRiskScore: snapshot?.conflictRiskScore || 0,
      files: snapshot?.conflictFiles || [],
    });
  } catch (err) {
    console.error('[Diagnostics] GET /conflicts:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/diagnostics/:owner/:repo/stale
router.get('/:owner/:repo/stale', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const gh = new GitHubClient(token);
    const branches = await gh.listBranches(owner, repo);
    const staleCutoff = new Date();
    staleCutoff.setDate(staleCutoff.getDate() - 7);

    const staleBranches = [];
    for (const branch of branches) {
      const commits = await gh.getCommits(owner, repo, branch.name).catch(() => []);
      const lastCommit = commits[0]?.commit?.committer?.date;
      if (lastCommit && new Date(lastCommit) < staleCutoff) {
        staleBranches.push({ name: branch.name, lastCommitAt: lastCommit });
      }
    }

    res.json({ staleBranches });
  } catch (err) {
    console.error('[Diagnostics] GET /stale:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
