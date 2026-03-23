const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const GitHubClient = require('../services/githubClient');
const { parseLog } = require('../services/logParser');
const { cacheGet, cacheSet } = require('../lib/redis');
const axios = require('axios');

async function getGHClient(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  return new GitHubClient(token);
}

// GET /api/pipeline/:owner/:repo/runs
router.get('/:owner/:repo/runs', async (req, res) => {
  try {
    const gh = await getGHClient(req);
    if (!gh) return res.status(401).json({ error: 'Unauthorized' });

    const { owner, repo } = req.params;
    const { page = 1, per_page = 10, branch } = req.query;

    const data = await gh.getWorkflowRuns(owner, repo, {
      page: Number(page),
      perPage: Number(per_page),
      branch,
    });

    const runs = (data.workflow_runs || []).map((r) => ({
      id: r.id,
      runNumber: r.run_number,
      branch: r.head_branch,
      triggerEvent: r.event,
      status: r.status,
      conclusion: r.conclusion,
      startedAt: r.created_at,
      completedAt: r.updated_at,
      durationSeconds: r.run_started_at
        ? Math.floor((new Date(r.updated_at) - new Date(r.run_started_at)) / 1000)
        : null,
      workflowName: r.name,
      htmlUrl: r.html_url,
      headSha: r.head_sha,
    }));

    res.json({
      runs,
      totalCount: data.total_count || runs.length,
      page: Number(page),
      perPage: Number(per_page),
    });
  } catch (err) {
    console.error('[Pipeline] GET runs:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pipeline/:owner/:repo/runs/:runId
router.get('/:owner/:repo/runs/:runId', async (req, res) => {
  try {
    const gh = await getGHClient(req);
    if (!gh) return res.status(401).json({ error: 'Unauthorized' });

    const { owner, repo, runId } = req.params;
    const run = await gh.getWorkflowRun(owner, repo, runId);

    res.json({
      id: run.id,
      runNumber: run.run_number,
      branch: run.head_branch,
      triggerEvent: run.event,
      status: run.status,
      conclusion: run.conclusion,
      startedAt: run.created_at,
      completedAt: run.updated_at,
      workflowName: run.name,
      htmlUrl: run.html_url,
    });
  } catch (err) {
    console.error('[Pipeline] GET run:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pipeline/:owner/:repo/runs/:runId/jobs
router.get('/:owner/:repo/runs/:runId/jobs', async (req, res) => {
  try {
    const gh = await getGHClient(req);
    if (!gh) return res.status(401).json({ error: 'Unauthorized' });

    const { owner, repo, runId } = req.params;
    const data = await gh.getRunJobs(owner, repo, runId);

    res.json(data);
  } catch (err) {
    console.error('[Pipeline] GET jobs:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pipeline/:owner/:repo/runs/:runId/logs
router.get('/:owner/:repo/runs/:runId/logs', async (req, res) => {
  try {
    const gh = await getGHClient(req);
    if (!gh) return res.status(401).json({ error: 'Unauthorized' });

    const { owner, repo, runId } = req.params;
    const cacheKey = `logs:${owner}:${repo}:${runId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    // Get logs URL
    const logsUrl = await gh.getRunLogsUrl(owner, repo, runId);

    if (!logsUrl) {
      return res.json({ raw: null, parsed: null, error: 'Logs not available' });
    }

    // Download raw log
    const token = req.headers.authorization?.replace('Bearer ', '');
    const logResponse = await axios.get(logsUrl, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'text',
      timeout: 30000,
    });

    const rawLog = logResponse.data || '';
    const parsed = parseLog(rawLog);

    const result = {
      raw: rawLog.slice(0, 50000), // cap at 50k chars
      parsed,
    };

    await cacheSet(cacheKey, result, 60);
    res.json(result);
  } catch (err) {
    console.error('[Pipeline] GET logs:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
