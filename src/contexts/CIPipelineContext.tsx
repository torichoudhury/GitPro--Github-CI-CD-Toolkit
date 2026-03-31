import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  getWorkflowRuns,
  getWorkflowJobs,
  checkRateLimit,
  setToken,
  getBranchDivergence,
  getConflictRiskFiles,
  getStaleBranches,
  listBranches,
  getRepoInsights,
} from "../services/githubAPIService";
import { useAuth } from "./AuthContext";
import {
  shouldFire,
  markFired,
  buildNudge,
  dismiss as dismissNudgeService,
} from "../services/nudgeService";
import type {
  WorkflowRun,
  WorkflowJob,
  DiagnosticsSnapshot,
  ActiveNudge,
  AppConfig,
  PollingInterval,
  ConnectedRepo,
  RateLimitInfo,
  RepoInsights,
} from "../types";

// ── Default config ────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: AppConfig = {
  githubToken: import.meta.env.VITE_GITHUB_TOKEN ?? "",
  githubUsername: import.meta.env.VITE_GITHUB_USERNAME ?? "",
  connectedRepos: import.meta.env.VITE_GITHUB_REPO
    ? [{ fullName: import.meta.env.VITE_GITHUB_REPO, defaultBranch: "master" }]
    : [],
  pollingInterval: 30 as PollingInterval,
  nudgeToggles: {
    push: true,
    pull: true,
    stale_branch: true,
    ci_failure: true,
  },
};

const CONFIG_STORAGE_KEY = "gitpro_config";

function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      // Always pick up env token if not overridden
      githubToken:
        parsed.githubToken || DEFAULT_CONFIG.githubToken,
      githubUsername:
        parsed.githubUsername || DEFAULT_CONFIG.githubUsername,
      nudgeToggles: {
        ...DEFAULT_CONFIG.nudgeToggles,
        ...(parsed.nudgeToggles ?? {}),
      },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(cfg: AppConfig) {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(cfg));
}

// ── Context shape ─────────────────────────────────────────────────────────────

interface CIPipelineContextType {
  config: AppConfig;
  setConfig: (updates: Partial<AppConfig>) => void;
  activeRepo: ConnectedRepo | null;
  setActiveRepo: (repo: ConnectedRepo | null) => void;

  // Pipeline data
  pipelineRuns: WorkflowRun[];
  currentRun: WorkflowRun | null;
  currentJobs: WorkflowJob[];
  isLoadingRuns: boolean;
  runsError: string | null;

  // Diagnostics
  diagnostics: DiagnosticsSnapshot | null;
  isLoadingDiagnostics: boolean;

  // Repository insights
  repoInsights: RepoInsights | null;
  isLoadingRepoInsights: boolean;
  repoInsightsError: string | null;

  // Nudges
  nudges: ActiveNudge[];
  dismissNudge: (id: string) => void;

  // Rate limit
  rateLimit: RateLimitInfo | null;

  // Manual refresh
  refreshRuns: () => Promise<void>;
  refreshDiagnostics: () => Promise<void>;
  refreshRepoInsights: () => Promise<void>;
}

const CIPipelineContext = createContext<CIPipelineContextType | undefined>(
  undefined
);

export const useCIPipeline = () => {
  const ctx = useContext(CIPipelineContext);
  if (!ctx) throw new Error("useCIPipeline must be inside CIPipelineProvider");
  return ctx;
};

// ── Provider ──────────────────────────────────────────────────────────────────

export const CIPipelineProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { userProfile } = useAuth();
  const [config, _setConfig] = useState<AppConfig>(loadConfig);
  const [activeRepo, setActiveRepo] = useState<ConnectedRepo | null>(() => {
    const cfg = loadConfig();
    return cfg.connectedRepos[0] ?? null;
  });

  const [pipelineRuns, setPipelineRuns] = useState<WorkflowRun[]>([]);
  const [currentRun, setCurrentRun] = useState<WorkflowRun | null>(null);
  const [currentJobs, setCurrentJobs] = useState<WorkflowJob[]>([]);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [runsError, setRunsError] = useState<string | null>(null);

  const [diagnostics, setDiagnostics] = useState<DiagnosticsSnapshot | null>(null);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);

  const [repoInsights, setRepoInsights] = useState<RepoInsights | null>(null);
  const [isLoadingRepoInsights, setIsLoadingRepoInsights] = useState(false);
  const [repoInsightsError, setRepoInsightsError] = useState<string | null>(null);

  const [nudges, setNudges] = useState<ActiveNudge[]>([]);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const diagTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const insightsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Config handler ──────────────────────────────────────────────────────────

  const setConfig = useCallback((updates: Partial<AppConfig>) => {
    _setConfig((prev) => {
      const next = { ...prev, ...updates };
      saveConfig(next);
      return next;
    });
  }, []);

  // Sync token into githubAPIService whenever config changes
  useEffect(() => {
    setToken(config.githubToken);
  }, [config.githubToken]);

  // Seed CI repositories from fetched GitHub profile when no repos are configured yet.
  useEffect(() => {
    if (!userProfile) return;

    const profileRepos: ConnectedRepo[] = (userProfile.repositories ?? [])
      .filter((repo) => Boolean(repo.full_name))
      .map((repo) => ({
        fullName: repo.full_name,
        defaultBranch: repo.default_branch || "main",
      }));

    _setConfig((prev) => {
      const hasConfiguredRepos = prev.connectedRepos.length > 0;
      const inferredUsername = userProfile.githubUsername ?? prev.githubUsername;
      const shouldUpdateUsername = inferredUsername !== prev.githubUsername;

      if (hasConfiguredRepos || profileRepos.length === 0) {
        if (!shouldUpdateUsername) {
          return prev;
        }

        const next = {
          ...prev,
          githubUsername: inferredUsername,
        };
        saveConfig(next);
        return next;
      }

      const next = {
        ...prev,
        githubUsername: inferredUsername,
        connectedRepos: profileRepos,
      };
      saveConfig(next);
      return next;
    });
  }, [userProfile]);

  // Keep active repository aligned with connected repository list.
  useEffect(() => {
    if (config.connectedRepos.length === 0) {
      setActiveRepo(null);
      return;
    }

    setActiveRepo((prev) => {
      if (prev && config.connectedRepos.some((repo) => repo.fullName === prev.fullName)) {
        return prev;
      }
      return config.connectedRepos[0];
    });
  }, [config.connectedRepos]);

  // ── Fetch pipeline runs ─────────────────────────────────────────────────────

  const fetchRepoInsights = useCallback(async () => {
    if (!activeRepo) return;
    setIsLoadingRepoInsights(true);
    setRepoInsightsError(null);
    try {
      const insights = await getRepoInsights(
        activeRepo.fullName,
        activeRepo.defaultBranch
      );
      setRepoInsights(insights);
    } catch (e: any) {
      setRepoInsights(null);
      setRepoInsightsError(e?.message ?? "Failed to fetch repository insights");
    } finally {
      setIsLoadingRepoInsights(false);
    }
  }, [activeRepo]);

  const fetchRuns = useCallback(async () => {
    if (!activeRepo) return;
    setIsLoadingRuns(true);
    setRunsError(null);
    try {
      const runs = await getWorkflowRuns(activeRepo.fullName, undefined, 30);
      setPipelineRuns(runs);

      // most recent run
      const latest = runs[0] ?? null;
      setCurrentRun(latest);

      if (latest) {
        const jobs = await getWorkflowJobs(activeRepo.fullName, latest.id);
        setCurrentJobs(jobs);
      } else {
        setCurrentJobs([]);

        // CI failure nudge
      }

      if (
        latest &&
        latest.conclusion === "failure" &&
        config.nudgeToggles.ci_failure &&
        shouldFire(activeRepo.fullName, "ci_failure")
      ) {
        const nudge = buildNudge(
          activeRepo.fullName,
          "ci_failure",
          `Run #${latest.run_number} on ${latest.head_branch} failed.`
        );
        markFired(activeRepo.fullName, "ci_failure");
        setNudges((prev) => [nudge, ...prev]);
      }

      // Rate limit
      const rl = await checkRateLimit();
      setRateLimit(rl);
    } catch (e: any) {
      setRunsError(e.message ?? "Failed to fetch pipeline data");
    } finally {
      setIsLoadingRuns(false);
    }
  }, [activeRepo, config.nudgeToggles.ci_failure]);

  // ── Fetch diagnostics ───────────────────────────────────────────────────────

  const fetchDiagnostics = useCallback(async () => {
    if (!activeRepo) return;
    setIsLoadingDiagnostics(true);
    try {
      const base = activeRepo.defaultBranch;
      let compareBranch = currentRun?.head_branch;

      if (!compareBranch || compareBranch === base) {
        try {
          const branches = await listBranches(activeRepo.fullName);
          const fallbackBranch = branches.find(
            (branch: any) => branch?.name && branch.name !== base
          )?.name;
          if (fallbackBranch) {
            compareBranch = fallbackBranch;
          }
        } catch {
          // Ignore fallback branch lookup failures.
        }
      }

      let divergence = null;
      let conflictFiles: any[] = [];
      let staleBranches: any[] = [];

      if (compareBranch && compareBranch !== base) {
        try {
          divergence = await getBranchDivergence(
            activeRepo.fullName,
            base,
            compareBranch
          );
        } catch {
          // ignore
        }

        try {
          conflictFiles = await getConflictRiskFiles(
            activeRepo.fullName,
            base,
            compareBranch
          );
        } catch {
          // ignore
        }
      }

      try {
        staleBranches = await getStaleBranches(activeRepo.fullName, 7);
      } catch { /* ignore */ }

      setDiagnostics({
        divergence,
        conflictFiles,
        staleBranches,
        refreshedAt: new Date().toISOString(),
      });

      // Stale branch nudge
      if (
        staleBranches.length > 0 &&
        config.nudgeToggles.stale_branch &&
        shouldFire(activeRepo.fullName, "stale_branch")
      ) {
        const nudge = buildNudge(
          activeRepo.fullName,
          "stale_branch",
          `${staleBranches.length} stale branch(es) detected in ${activeRepo.fullName}.`
        );
        markFired(activeRepo.fullName, "stale_branch");
        setNudges((prev) => [nudge, ...prev]);
      }
    } catch (e) {
      console.error("Diagnostics fetch error:", e);
    } finally {
      setIsLoadingDiagnostics(false);
    }
  }, [activeRepo, config.nudgeToggles.stale_branch, currentRun?.head_branch]);

  // ── Polling ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeRepo) {
      setRepoInsights(null);
      setRepoInsightsError(null);
      setDiagnostics(null);
      setPipelineRuns([]);
      setCurrentRun(null);
      setCurrentJobs([]);
      return;
    }

    fetchRuns();
    fetchDiagnostics();
    fetchRepoInsights();

    const intervalMs = config.pollingInterval * 1000;

    pollTimerRef.current = setInterval(fetchRuns, intervalMs);
    diagTimerRef.current = setInterval(fetchDiagnostics, 30 * 1000); // Poll diagnostics every 30s instead of 5m
    insightsTimerRef.current = setInterval(fetchRepoInsights, 60 * 1000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (diagTimerRef.current) clearInterval(diagTimerRef.current);
      if (insightsTimerRef.current) clearInterval(insightsTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRepo?.fullName, config.pollingInterval]);

  // ── Dismiss nudge ────────────────────────────────────────────────────────────

  const dismissNudge = useCallback((id: string) => {
    setNudges((prev) => {
      const nudge = prev.find((n) => n.id === id);
      if (nudge) dismissNudgeService(nudge.repo, nudge.type);
      return prev.filter((n) => n.id !== id);
    });
  }, []);

  return (
    <CIPipelineContext.Provider
      value={{
        config,
        setConfig,
        activeRepo,
        setActiveRepo,
        pipelineRuns,
        currentRun,
        currentJobs,
        isLoadingRuns,
        runsError,
        diagnostics,
        isLoadingDiagnostics,
        repoInsights,
        isLoadingRepoInsights,
        repoInsightsError,
        nudges,
        dismissNudge,
        rateLimit,
        refreshRuns: fetchRuns,
        refreshDiagnostics: fetchDiagnostics,
        refreshRepoInsights: fetchRepoInsights,
      }}
    >
      {children}
    </CIPipelineContext.Provider>
  );
};
