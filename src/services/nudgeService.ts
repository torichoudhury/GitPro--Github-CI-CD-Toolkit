import type { NudgeType, ActiveNudge } from "../types";

const STORAGE_KEY = "gitpro_nudge_state";
const DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface NudgeState {
  [key: string]: number; // `${repo}__${type}` → lastFiredAt ms
}

function load(): NudgeState {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function save(state: NudgeState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function key(repo: string, type: NudgeType) {
  return `${repo}__${type}`;
}

export function shouldFire(
  repo: string,
  type: NudgeType,
  now = Date.now()
): boolean {
  const state = load();
  const last = state[key(repo, type)] ?? 0;
  return now - last > DEDUP_WINDOW_MS;
}

export function markFired(repo: string, type: NudgeType, now = Date.now()) {
  const state = load();
  state[key(repo, type)] = now;
  save(state);
}

export function dismiss(repo: string, type: NudgeType) {
  // Set fired time to now to suppress re-fire within dedup window
  markFired(repo, type);
}

export function buildNudge(
  repo: string,
  type: NudgeType,
  extraMessage?: string
): ActiveNudge {
  const id = `${key(repo, type)}_${Date.now()}`;
  const now = Date.now();

  const templates: Record<
    NudgeType,
    { title: string; message: string }
  > = {
    push: {
      title: "💾 Back up your work",
      message:
        "You haven't pushed in 2+ hours. Push your commits to avoid losing progress.",
    },
    pull: {
      title: "⬇️ Pull before continuing",
      message:
        extraMessage ??
        "Your base branch has new commits. Pull now to reduce merge conflicts.",
    },
    stale_branch: {
      title: "🌿 Stale branch detected",
      message:
        extraMessage ??
        "This branch has had no activity in 7+ days. Consider merging or deleting it.",
    },
    ci_failure: {
      title: "❌ Pipeline failed",
      message:
        extraMessage ??
        "Your recent CI run failed. Check the Log Translator for the root cause.",
    },
  };

  const tpl = templates[type];
  return {
    id,
    type,
    repo,
    title: tpl.title,
    message: tpl.message,
    createdAt: now,
  };
}
