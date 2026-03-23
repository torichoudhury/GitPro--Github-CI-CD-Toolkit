const prisma = require('../lib/prisma');

const NUDGE_DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const NUDGE_MESSAGES = {
  push_nudge: (repo) =>
    `⬆️ You have uncommitted local changes in ${repo} with no push in 2+ hours. Push your changes!`,
  pull_nudge: (repo, behind) =>
    `⬇️ Your branch is ${behind} commit(s) behind the base. Pull latest changes to stay in sync.`,
  stale_branch: (branch) =>
    `🌿 Branch "${branch}" has had no activity in 7+ days. Consider merging or deleting it.`,
  ci_failure: (repo, workflow) =>
    `❌ CI pipeline failed in ${repo} on workflow "${workflow}". Check the logs.`,
};

/**
 * Check dedup window — don't create the same nudge type for same repo within 1hr
 */
async function isDuplicate(userId, repositoryId, nudgeType) {
  const cutoff = new Date(Date.now() - NUDGE_DEDUP_WINDOW_MS);
  const existing = await prisma.nudgeLog.findFirst({
    where: {
      userId,
      repositoryId,
      nudgeType,
      triggeredAt: { gte: cutoff },
    },
  });
  return !!existing;
}

/**
 * Create a nudge if not already created recently
 */
async function createNudge(userId, repositoryId, nudgeType, message) {
  const isDup = await isDuplicate(userId, repositoryId, nudgeType);
  if (isDup) {
    console.log(`[NudgeEngine] Deduped ${nudgeType} for repo ${repositoryId}`);
    return null;
  }

  const nudge = await prisma.nudgeLog.create({
    data: { userId, repositoryId, nudgeType, message },
  });

  console.log(`[NudgeEngine] Created nudge: ${nudgeType} → ${message}`);
  return nudge;
}

/**
 * Evaluate nudges after a diagnostics snapshot
 */
async function evaluateNudges(repo, snapshot, latestRun = null) {
  const { userId, id: repositoryId, owner, repoName } = repo;
  const repoLabel = `${owner}/${repoName}`;
  const nudges = [];

  // 1. Push nudge
  if (snapshot?.lastPushedAt) {
    const lastPush = new Date(snapshot.lastPushedAt);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    if (lastPush < twoHoursAgo && snapshot.commitsAhead > 0) {
      const nudge = await createNudge(
        userId, repositoryId, 'push_nudge',
        NUDGE_MESSAGES.push_nudge(repoLabel)
      );
      if (nudge) nudges.push(nudge);
    }
  }

  // 2. Pull nudge
  if (snapshot?.commitsBehind > 0) {
    const nudge = await createNudge(
      userId, repositoryId, 'pull_nudge',
      NUDGE_MESSAGES.pull_nudge(repoLabel, snapshot.commitsBehind)
    );
    if (nudge) nudges.push(nudge);
  }

  // 3. Stale branch nudges
  if (Array.isArray(snapshot?.staleBranches)) {
    for (const stale of snapshot.staleBranches.slice(0, 3)) {
      const nudge = await createNudge(
        userId, repositoryId, 'stale_branch',
        NUDGE_MESSAGES.stale_branch(stale.name)
      );
      if (nudge) nudges.push(nudge);
    }
  }

  // 4. CI failure nudge
  if (latestRun?.conclusion === 'failure') {
    const nudge = await createNudge(
      userId, repositoryId, 'ci_failure',
      NUDGE_MESSAGES.ci_failure(repoLabel, latestRun.workflowName)
    );
    if (nudge) nudges.push(nudge);
  }

  return nudges;
}

module.exports = { evaluateNudges, createNudge };
