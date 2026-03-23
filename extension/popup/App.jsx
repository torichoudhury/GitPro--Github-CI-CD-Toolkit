import React, { useState, useEffect, createContext, useContext } from 'react';
import Sidebar from '../components/Sidebar';
import Dashboard from './pages/Dashboard';
import WorkflowVis from './pages/WorkflowVis';
import PipelineRuns from './pages/PipelineRuns';
import Diagnostics from './pages/Diagnostics';
import ConfigManager from './pages/ConfigManager';
import NudgeBanner from '../components/NudgeBanner';

// ── App Context ────────────────────────────────────────────────────────────────
export const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

const API_BASE = 'http://localhost:3000';

export default function App() {
  const [activePage, setActivePage]     = useState('dashboard');
  const [data, setData]                 = useState(null);
  const [loading, setLoading]           = useState(true);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [lastUpdated, setLastUpdated]   = useState(null);

  // Load mock dashboard on mount
  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 15000);
    return () => clearInterval(interval);
  }, []);

  async function fetchDashboard() {
    try {
      // Try to load from chrome.storage first for instant load
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const stored = await new Promise((res) =>
          chrome.storage.local.get(['dashboardData', 'lastUpdated'], res)
        );
        if (stored.dashboardData) {
          setData(stored.dashboardData);
          setLastUpdated(stored.lastUpdated);
          setLoading(false);
        }
      }

      // Always fetch fresh from mock API
      const res = await fetch(`${API_BASE}/api/mock/dashboard`);
      if (!res.ok) throw new Error('API unavailable');
      const fresh = await res.json();
      setData(fresh);
      setLastUpdated(Date.now());
      setLoading(false);

      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ dashboardData: fresh, lastUpdated: Date.now() });
      }
    } catch {
      // If API is down, use built-in fallback mock
      if (!data) {
        setData(FALLBACK_MOCK);
        setLoading(false);
      }
    }
  }

  const dismissNudge = (id) => {
    setData((prev) => ({
      ...prev,
      nudges: prev.nudges.map((n) => (n.id === id ? { ...n, dismissed: true } : n)),
    }));
  };

  const activeNudges = data?.nudges?.filter((n) => !n.dismissed) || [];

  const pages = {
    dashboard:    <Dashboard />,
    workflow:     <WorkflowVis />,
    pipeline:     <PipelineRuns />,
    diagnostics:  <Diagnostics />,
    config:       <ConfigManager />,
  };

  return (
    <AppContext.Provider value={{
      data, loading, activePage, setActivePage,
      selectedRepo, setSelectedRepo,
      selectedBranch, setSelectedBranch,
      lastUpdated, fetchDashboard, dismissNudge,
      apiBase: API_BASE,
    }}>
      <div className="flex w-full h-full overflow-hidden bg-gh-bg">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Repo + Branch selector bar */}
          <div className="flex items-center gap-3 px-5 py-2.5 border-b border-gh-border bg-gh-bg shrink-0">
            <select
              className="bg-gh-card border border-gh-border text-gh-text text-xs rounded-md px-2.5 py-1.5 outline-none focus:border-gh-blue cursor-pointer"
              value={selectedRepo || ''}
              onChange={(e) => setSelectedRepo(e.target.value)}
            >
              {(data?.repos || [{ owner: 'octocat', repoName: 'gitpro-demo' }]).map((r) => (
                <option key={r.id || r.repoName} value={`${r.owner}/${r.repoName}`}>
                  {r.owner}/{r.repoName}
                </option>
              ))}
            </select>
            <select
              className="bg-gh-card border border-gh-border text-gh-text text-xs rounded-md px-2.5 py-1.5 outline-none focus:border-gh-blue cursor-pointer"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              {['main', 'feat/auth', 'feat/ui', 'fix/api'].map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <div className="ml-auto flex items-center gap-2">
              {lastUpdated && (
                <span className="text-gh-muted text-xs font-mono">
                  Updated {new Date(lastUpdated).toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={fetchDashboard}
                className="text-gh-muted hover:text-gh-blue transition-colors text-xs"
                title="Refresh"
              >↺</button>
            </div>
          </div>

          {/* Active nudge banners */}
          {activeNudges.length > 0 && (
            <div className="px-5 pt-3 space-y-1.5 shrink-0">
              {activeNudges.slice(0, 2).map((n) => (
                <NudgeBanner key={n.id} nudge={n} onDismiss={dismissNudge} />
              ))}
            </div>
          )}

          {/* Page content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gh-muted text-sm animate-pulse font-mono">
                  Loading GitPro…
                </div>
              </div>
            ) : (
              pages[activePage] || <Dashboard />
            )}
          </div>
        </main>
      </div>
    </AppContext.Provider>
  );
}

// ── Built-in fallback mock (used when backend is unreachable) ─────────────────
const FALLBACK_MOCK = {
  meta: { demoMode: true },
  pipeline: {
    stages: [
      { id: 'build',  name: 'Build',  status: 'success',     conclusion: 'success', duration: '1m 12s', logs: ['> npm run build', '✓ Compiled in 34.2s'] },
      { id: 'lint',   name: 'Lint',   status: 'success',     conclusion: 'success', duration: '0m 22s', logs: ['> eslint src/', '✓ No errors found'] },
      { id: 'test',   name: 'Test',   status: 'in_progress', conclusion: null,      duration: null,     logs: ['> jest --coverage', '○ 142 tests running…'] },
      { id: 'deploy', name: 'Deploy', status: 'pending',     conclusion: null,      duration: null,     logs: [] },
    ],
  },
  monitor: {
    runId: '#4829', trigger: 'push / main', duration: '7m 02s',
    successRate: '98%', progress: 65, progressLabel: 'Running Tests (3/4)',
    branch: 'main', workflowName: 'CI Pipeline',
  },
  recentRuns: [
    { runNumber: 4829, branch: 'main',       trigger: 'push',         status: 'in_progress', conclusion: null,      duration: '—',      startedAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),   htmlUrl: '#' },
    { runNumber: 4828, branch: 'feat/auth',  trigger: 'pull_request', status: 'completed',   conclusion: 'success', duration: '5m 18s', startedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(), htmlUrl: '#' },
    { runNumber: 4827, branch: 'main',       trigger: 'push',         status: 'completed',   conclusion: 'failure', duration: '2m 04s', startedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(), htmlUrl: '#' },
  ],
  diagnostics: {
    branch: 'main', commitsAhead: 3, commitsBehind: 7, riskLevel: 'yellow',
    conflictRiskScore: 34,
    conflictFiles: [{ file: 'src/api/routes/auth.ts', editCount: 5 }],
    staleBranches: [{ name: 'feat/old-feature', lastCommitAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }],
    lastPushedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  nudges: [
    { id: 'nudge-1', nudgeType: 'pull_nudge',   message: '⬇️ Your branch is 7 commits behind main. Pull latest changes.', triggeredAt: new Date().toISOString(), dismissed: false },
    { id: 'nudge-2', nudgeType: 'stale_branch', message: '🌿 Branch "feat/old-feature" has had no activity in 10 days.',    triggeredAt: new Date().toISOString(), dismissed: false },
  ],
  repos: [
    { id: 'repo-1', owner: 'octocat', repoName: 'gitpro-demo', defaultBranch: 'main', isActive: true },
  ],
};
