// ── GitHub Workflow Types ───────────────────────────────────────────────────

export type RunStatus = "queued" | "in_progress" | "completed";
export type RunConclusion =
  | "success"
  | "failure"
  | "cancelled"
  | "skipped"
  | "timed_out"
  | "neutral"
  | null;

export interface WorkflowRun {
  id: number;
  name: string;
  run_number: number;
  status: RunStatus;
  conclusion: RunConclusion;
  head_branch: string;
  event: string; // "push" | "pull_request" | "workflow_dispatch" | ...
  html_url: string;
  created_at: string;
  updated_at: string;
  run_started_at: string;
  actor: {
    login: string;
    avatar_url: string;
  };
  repository: {
    full_name: string;
  };
  // computed
  durationSeconds?: number;
}

export interface WorkflowJob {
  id: number;
  name: string;
  status: RunStatus;
  conclusion: RunConclusion;
  started_at: string | null;
  completed_at: string | null;
  html_url: string;
  steps: WorkflowStep[];
  // computed
  durationSeconds?: number;
}

export interface WorkflowStep {
  name: string;
  status: RunStatus;
  conclusion: RunConclusion;
  number: number;
  started_at: string | null;
  completed_at: string | null;
}

// ── Pipeline Stage (for visualization) ─────────────────────────────────────

export type StageStatus = "pending" | "in_progress" | "success" | "failure";

export interface PipelineStage {
  id: string;
  label: string;
  icon: any;
  status: StageStatus;
  job?: WorkflowJob;
}

// ── Diagnostics ─────────────────────────────────────────────────────────────

export interface BranchDivergence {
  ahead: number;
  behind: number;
  baseBranch: string;
  currentBranch: string;
}

export interface ConflictRiskFile {
  filename: string;
  riskScore: number; // 0–1
  recentEditors: { login: string; daysAgo: number }[];
}

export interface StaleBranch {
  name: string;
  lastCommitAt: string;
  daysInactive: number;
  author: string;
}

export interface DiagnosticsSnapshot {
  divergence: BranchDivergence | null;
  conflictFiles: ConflictRiskFile[];
  staleBranches: StaleBranch[];
  refreshedAt: string;
}

// ── Nudges ──────────────────────────────────────────────────────────────────

export type NudgeType = "push" | "pull" | "stale_branch" | "ci_failure";

export interface ActiveNudge {
  id: string;
  type: NudgeType;
  title: string;
  message: string;
  repo: string;
  createdAt: number; // unix ms
}

// ── Config ──────────────────────────────────────────────────────────────────

export type PollingInterval = 15 | 30 | 60 | 300;

export interface ConnectedRepo {
  fullName: string; // "owner/repo"
  defaultBranch: string;
}

export interface NudgeToggles {
  push: boolean;
  pull: boolean;
  stale_branch: boolean;
  ci_failure: boolean;
}

export interface AppConfig {
  githubToken: string;
  githubUsername: string;
  connectedRepos: ConnectedRepo[];
  pollingInterval: PollingInterval;
  nudgeToggles: NudgeToggles;
}

// ── Log Analysis ────────────────────────────────────────────────────────────

export type FailureCategory =
  | "dependency_error"
  | "test_failure"
  | "lint_error"
  | "env_missing"
  | "unknown";

export interface LogAnalysisResult {
  category: FailureCategory;
  rootCauseLine: string;
  rootCauseLineIndex: number;
  fixSuggestion: string;
  lines: string[];
}

// ── Rate Limit ──────────────────────────────────────────────────────────────

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: number; // unix seconds
}
