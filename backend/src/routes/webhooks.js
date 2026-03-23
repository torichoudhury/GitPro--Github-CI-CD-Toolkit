const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { runDiagnostics } = require('../services/diagnosticsEngine');
const { evaluateNudges } = require('../services/nudgeEngine');

/**
 * Verify GitHub webhook HMAC-SHA256 signature
 */
function verifySignature(req) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return true; // skip in dev if not set

  const sig = req.headers['x-hub-signature-256'];
  if (!sig) return false;

  const body = JSON.stringify(req.body);
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

// POST /api/webhooks/github
router.post('/github', async (req, res) => {
  try {
    if (!verifySignature(req)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const event = req.headers['x-github-event'];
    const payload = req.body;

    console.log(`[Webhook] Received event: ${event}`);

    // Find matching repo in DB
    const owner = payload.repository?.owner?.login;
    const repoName = payload.repository?.name;

    if (!owner || !repoName) {
      return res.status(200).json({ ok: true, skipped: 'no repo info' });
    }

    const repo = await prisma.repository.findFirst({
      where: { owner, repoName, isActive: true },
      include: { user: true },
    });

    if (!repo) {
      return res.status(200).json({ ok: true, skipped: 'repo not tracked' });
    }

    if (event === 'push') {
      // Trigger diagnostics refresh
      if (repo.user?.githubToken) {
        setImmediate(() => runDiagnostics(repo, repo.user.githubToken).catch(console.error));
      }
    }

    if (event === 'workflow_run') {
      const run = payload.workflow_run;
      if (run) {
        // Upsert PipelineRun
        await prisma.pipelineRun.upsert({
          where: { runId: BigInt(run.id) },
          update: {
            status: run.status,
            conclusion: run.conclusion,
            completedAt: run.updated_at ? new Date(run.updated_at) : null,
            durationSeconds: run.run_started_at
              ? Math.floor((new Date(run.updated_at) - new Date(run.run_started_at)) / 1000)
              : null,
          },
          create: {
            repositoryId: repo.id,
            runId: BigInt(run.id),
            runNumber: run.run_number,
            branch: run.head_branch,
            triggerEvent: run.event,
            status: run.status,
            conclusion: run.conclusion,
            startedAt: run.run_started_at ? new Date(run.run_started_at) : null,
            completedAt: run.updated_at ? new Date(run.updated_at) : null,
            durationSeconds: run.run_started_at
              ? Math.floor((new Date(run.updated_at) - new Date(run.run_started_at)) / 1000)
              : null,
            workflowName: run.name,
          },
        });

        // Evaluate nudges if run completed
        if (run.status === 'completed') {
          setImmediate(() =>
            evaluateNudges(repo, null, {
              conclusion: run.conclusion,
              workflowName: run.name,
            }).catch(console.error)
          );
        }
      }
    }

    if (event === 'pull_request') {
      // Trigger conflict risk recalculation
      if (repo.user?.githubToken) {
        setImmediate(() => runDiagnostics(repo, repo.user.githubToken).catch(console.error));
      }
    }

    res.status(200).json({ ok: true, event });
  } catch (err) {
    console.error('[Webhook] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
