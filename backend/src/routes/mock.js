const express = require('express');
const router = express.Router();

// GET /api/mock/dashboard — fully populated fake data for demo mode
router.get('/dashboard', (req, res) => {
  res.json({
    meta: { demoMode: true, refreshedAt: new Date().toISOString() },

    pipeline: {
      stages: [
        {
          id: 'build',
          name: 'Build',
          status: 'success',
          duration: '1m 12s',
          conclusion: 'success',
          startedAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          logs: [
            '> npm run build',
            '✓ Compiled successfully in 34.2s',
            '✓ Bundle size: 248kb (gzipped)',
          ],
        },
        {
          id: 'lint',
          name: 'Lint',
          status: 'success',
          duration: '0m 22s',
          conclusion: 'success',
          startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 4 * 60 * 1000 - 38 * 1000).toISOString(),
          logs: [
            '> eslint src/ --ext .ts,.tsx',
            '✓ No lint errors found',
            '✓ ESLint passed (0 warnings)',
          ],
        },
        {
          id: 'test',
          name: 'Test',
          status: 'in_progress',
          duration: null,
          conclusion: null,
          startedAt: new Date(Date.now() - 4 * 60 * 1000 - 38 * 1000).toISOString(),
          completedAt: null,
          logs: [
            '> jest --coverage',
            '  ● Running 142 tests...',
            '  ✓ 138 passed',
            '  ○ 4 running...',
          ],
        },
        {
          id: 'deploy',
          name: 'Deploy',
          status: 'pending',
          duration: null,
          conclusion: null,
          startedAt: null,
          completedAt: null,
          logs: [],
        },
      ],
    },

    monitor: {
      runId: '#4829',
      trigger: 'push / main',
      duration: '7m 02s',
      successRate: '98%',
      progress: 65,
      progressLabel: 'Running Tests (step 3 of 4)',
      branch: 'main',
      workflowName: 'CI Pipeline',
    },

    recentRuns: [
      { runNumber: 4829, branch: 'main',        trigger: 'push',          status: 'in_progress', conclusion: null,      duration: '—',     startedAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),         htmlUrl: '#' },
      { runNumber: 4828, branch: 'feat/auth',   trigger: 'pull_request',  status: 'completed',   conclusion: 'success', duration: '5m 18s', startedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),       htmlUrl: '#' },
      { runNumber: 4827, branch: 'main',        trigger: 'push',          status: 'completed',   conclusion: 'failure', duration: '2m 04s', startedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),       htmlUrl: '#' },
      { runNumber: 4826, branch: 'feat/ui',     trigger: 'pull_request',  status: 'completed',   conclusion: 'success', duration: '6m 41s', startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),  htmlUrl: '#' },
      { runNumber: 4825, branch: 'fix/api',     trigger: 'push',          status: 'completed',   conclusion: 'success', duration: '4m 55s', startedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),  htmlUrl: '#' },
      { runNumber: 4824, branch: 'main',        trigger: 'schedule',      status: 'completed',   conclusion: 'success', duration: '5m 30s', startedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),  htmlUrl: '#' },
      { runNumber: 4823, branch: 'feat/cache',  trigger: 'pull_request',  status: 'completed',   conclusion: 'success', duration: '3m 12s', startedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), htmlUrl: '#' },
      { runNumber: 4822, branch: 'main',        trigger: 'push',          status: 'completed',   conclusion: 'success', duration: '5m 48s', startedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(), htmlUrl: '#' },
      { runNumber: 4821, branch: 'hotfix/typo', trigger: 'push',          status: 'completed',   conclusion: 'success', duration: '2m 09s', startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), htmlUrl: '#' },
      { runNumber: 4820, branch: 'main',        trigger: 'push',          status: 'completed',   conclusion: 'failure', duration: '1m 50s', startedAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(), htmlUrl: '#' },
    ],

    diagnostics: {
      branch: 'main',
      commitsAhead: 3,
      commitsBehind: 7,
      riskLevel: 'yellow',
      conflictRiskScore: 34,
      conflictFiles: [
        { file: 'src/api/routes/auth.ts',      editCount: 5 },
        { file: 'src/components/Dashboard.tsx', editCount: 4 },
        { file: 'package.json',                editCount: 3 },
      ],
      staleBranches: [
        { name: 'feat/old-feature', lastCommitAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
        { name: 'fix/deprecated',   lastCommitAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() },
      ],
      lastPushedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },

    nudges: [
      {
        id: 'nudge-1',
        nudgeType: 'pull_nudge',
        message: '⬇️ Your branch is 7 commits behind main. Pull latest changes to stay in sync.',
        triggeredAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        dismissed: false,
        repository: { owner: 'octocat', repoName: 'gitpro-demo' },
      },
      {
        id: 'nudge-2',
        nudgeType: 'stale_branch',
        message: '🌿 Branch "feat/old-feature" has had no activity in 10 days. Consider merging or deleting it.',
        triggeredAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        dismissed: false,
        repository: { owner: 'octocat', repoName: 'gitpro-demo' },
      },
    ],

    repos: [
      { id: 'repo-1', owner: 'octocat', repoName: 'gitpro-demo', defaultBranch: 'main', isActive: true },
      { id: 'repo-2', owner: 'octocat', repoName: 'api-service',  defaultBranch: 'main', isActive: true },
    ],
  });
});

module.exports = router;
