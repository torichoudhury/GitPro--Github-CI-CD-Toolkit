import type {
  WorkflowRun,
  WorkflowJob,
  BranchDivergence,
  ConflictRiskFile,
  StaleBranch,
  RateLimitInfo,
  ConnectedRepo,
} from "../types";

const BASE = "https://api.github.com";

// Pull token from Vite env (set in .env as VITE_GITHUB_TOKEN)
let _token: string = import.meta.env.VITE_GITHUB_TOKEN ?? "";

export const setToken = (token: string) => {
  _token = token;
};

export const getToken = () => _token;

export const hasToken = () => Boolean(_token);

function headers(): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (_token) h["Authorization"] = `Bearer ${_token}`;
  return h;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: headers() });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status} — ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Rate Limit ───────────────────────────────────────────────────────────────

export async function checkRateLimit(): Promise<RateLimitInfo> {
  const data = await get<any>("/rate_limit");
  return {
    limit: data.rate.limit,
    remaining: data.rate.remaining,
    resetAt: data.rate.reset,
  };
}

// ── Token Validation ─────────────────────────────────────────────────────────

export async function validateToken(
  token: string
): Promise<{ valid: boolean; login?: string }> {
  const res = await fetch(`${BASE}/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) return { valid: false };
  const data = await res.json();
  return { valid: true, login: data.login };
}

// ── Repositories ─────────────────────────────────────────────────────────────

export async function getRepoInfo(
  fullName: string
): Promise<ConnectedRepo | null> {
  try {
    const data = await get<any>(`/repos/${fullName}`);
    return { fullName: data.full_name, defaultBranch: data.default_branch };
  } catch {
    return null;
  }
}

// ── Workflow Runs ─────────────────────────────────────────────────────────────

export async function getWorkflowRuns(
  fullName: string,
  branch?: string,
  perPage = 30
): Promise<WorkflowRun[]> {
  const branchQ = branch ? `&branch=${encodeURIComponent(branch)}` : "";
  const data = await get<any>(
    `/repos/${fullName}/actions/runs?per_page=${perPage}${branchQ}`
  );
  const runs: WorkflowRun[] = (data.workflow_runs ?? []).map((r: any) => ({
    ...r,
    durationSeconds:
      r.run_started_at && r.updated_at
        ? Math.max(
            0,
            Math.floor(
              (new Date(r.updated_at).getTime() -
                new Date(r.run_started_at).getTime()) /
                1000
            )
          )
        : undefined,
  }));
  return runs;
}

// ── Workflow Jobs ─────────────────────────────────────────────────────────────

export async function getWorkflowJobs(
  fullName: string,
  runId: number
): Promise<WorkflowJob[]> {
  const data = await get<any>(
    `/repos/${fullName}/actions/runs/${runId}/jobs?per_page=100`
  );
  const jobs: WorkflowJob[] = (data.jobs ?? []).map((j: any) => ({
    ...j,
    durationSeconds:
      j.started_at && j.completed_at
        ? Math.max(
            0,
            Math.floor(
              (new Date(j.completed_at).getTime() -
                new Date(j.started_at).getTime()) /
                1000
            )
          )
        : undefined,
  }));
  return jobs;
}

// ── Job Logs ──────────────────────────────────────────────────────────────────

export async function getJobLogs(
  fullName: string,
  jobId: number
): Promise<string> {
  const res = await fetch(
    `${BASE}/repos/${fullName}/actions/jobs/${jobId}/logs`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error(`Could not fetch logs: ${res.status}`);
  return res.text();
}

// ── Branch Comparison ─────────────────────────────────────────────────────────

export async function getBranchDivergence(
  fullName: string,
  base: string,
  head: string
): Promise<BranchDivergence> {
  const data = await get<any>(
    `/repos/${fullName}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`
  );
  return {
    ahead: data.ahead_by ?? 0,
    behind: data.behind_by ?? 0,
    baseBranch: base,
    currentBranch: head,
  };
}

// ── Recent Commits (for conflict detection) ───────────────────────────────────

export async function getRecentCommits(
  fullName: string,
  branch: string,
  since: string // ISO 8601
): Promise<any[]> {
  const data = await get<any[]>(
    `/repos/${fullName}/commits?sha=${encodeURIComponent(branch)}&since=${since}&per_page=100`
  );
  return data;
}

// ── Conflict Risk Scoring ─────────────────────────────────────────────────────

export async function getConflictRiskFiles(
  fullName: string,
  baseBranch: string,
  currentBranch: string
): Promise<ConflictRiskFile[]> {
  // Files changed in current branch vs base
  const compareData = await get<any>(
    `/repos/${fullName}/compare/${encodeURIComponent(baseBranch)}...${encodeURIComponent(currentBranch)}`
  );
  const branchFiles = new Set<string>(
    (compareData.files ?? []).map((f: any) => f.filename)
  );

  // Recent commits on base by other contributors in last 48 hrs
  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const recentCommits = await getRecentCommits(fullName, baseBranch, since);

  // Map filename → list of {login, daysAgo}
  const fileEditorMap: Record<
    string,
    { login: string; daysAgo: number }[]
  > = {};

  for (const commit of recentCommits.slice(0, 20)) {
    const login = commit?.author?.login ?? commit?.commit?.author?.name ?? "unknown";
    const date = new Date(commit?.commit?.author?.date ?? "");
    const daysAgo = Math.floor((Date.now() - date.getTime()) / 86400000);

    // Fetch files for this commit
    try {
      const detail = await get<any>(`/repos/${fullName}/commits/${commit.sha}`);
      for (const f of detail.files ?? []) {
        if (!fileEditorMap[f.filename]) fileEditorMap[f.filename] = [];
        fileEditorMap[f.filename].push({ login, daysAgo });
      }
    } catch {
      // Skip individual commit detail errors
    }
  }

  const result: ConflictRiskFile[] = [];
  for (const filename of branchFiles) {
    const editors = fileEditorMap[filename] ?? [];
    const riskScore = Math.min(editors.length / 3, 1); // normalise to 0-1
    result.push({ filename, riskScore, recentEditors: editors.slice(0, 5) });
  }

  return result.sort((a, b) => b.riskScore - a.riskScore);
}

// ── Branches ──────────────────────────────────────────────────────────────────

export async function listBranches(fullName: string): Promise<any[]> {
  const data = await get<any[]>(
    `/repos/${fullName}/branches?per_page=100`
  );
  return data;
}

export async function getStaleBranches(
  fullName: string,
  daysThreshold = 7
): Promise<StaleBranch[]> {
  const branches = await listBranches(fullName);
  const stale: StaleBranch[] = [];
  const cutoff = Date.now() - daysThreshold * 86400000;

  for (const branch of branches.slice(0, 50)) {
    try {
      const detail = await get<any>(
        `/repos/${fullName}/commits/${encodeURIComponent(branch.name)}`
      );
      const lastDate = new Date(
        detail?.commit?.author?.date ?? ""
      ).getTime();
      if (lastDate < cutoff) {
        const daysInactive = Math.floor((Date.now() - lastDate) / 86400000);
        stale.push({
          name: branch.name,
          lastCommitAt: detail?.commit?.author?.date ?? "",
          daysInactive,
          author: detail?.commit?.author?.name ?? "unknown",
        });
      }
    } catch {
      // Skip
    }
  }
  return stale.sort((a, b) => b.daysInactive - a.daysInactive);
}
