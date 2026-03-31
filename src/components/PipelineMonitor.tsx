import React from "react";
import { motion } from "framer-motion";
import { RefreshCw, Loader2, ExternalLink, GitBranch, Clock, Hash, Zap, TrendingUp } from "lucide-react";
import { useCIPipeline } from "../contexts/CIPipelineContext";

function fmtDuration(seconds?: number) {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const PipelineMonitor: React.FC = () => {
  const {
    currentRun,
    currentJobs,
    pipelineRuns,
    isLoadingRuns,
    runsError,
    activeRepo,
    refreshRuns,
    rateLimit,
  } = useCIPipeline();

  if (!activeRepo) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm" style={{ color: "#8b949e" }}>Select a repository in Settings to begin monitoring.</p>
      </div>
    );
  }

  // Compute success rate from last 10 runs
  const last10 = pipelineRuns.slice(0, 10);
  const successes = last10.filter((r) => r.conclusion === "success").length;
  const successRate = last10.length > 0 ? Math.round((successes / last10.length) * 100) : null;

  // Pipeline completion %
  let completionPct = 0;
  if (currentRun?.status === "completed") {
    completionPct = 100;
  } else if (currentJobs.length > 0) {
    const done = currentJobs.filter((j) => j.status === "completed").length;
    completionPct = Math.round((done / currentJobs.length) * 100);
  }

  const metrics = [
    {
      label: "Run ID",
      value: currentRun ? `#${currentRun.run_number}` : "—",
      icon: Hash,
      color: "#58a6ff",
    },
    {
      label: "Trigger",
      value: currentRun
        ? `${currentRun.event} (${currentRun.head_branch})`
        : "—",
      icon: GitBranch,
      color: "#3fb950",
    },
    {
      label: "Duration",
      value: fmtDuration(currentRun?.durationSeconds),
      icon: Clock,
      color: "#d29922",
    },
    {
      label: "Success Rate",
      value: successRate != null ? `${successRate}%` : "—",
      icon: TrendingUp,
      color: successRate != null && successRate >= 70 ? "#3fb950" : successRate != null && successRate >= 40 ? "#d29922" : "#f85149",
    },
  ];

  const statusLabel = currentRun?.status === "in_progress"
    ? "in progress"
    : currentRun?.conclusion ?? "—";

  const statusColor = currentRun?.conclusion === "success"
    ? "#3fb950"
    : currentRun?.conclusion === "failure"
    ? "#f85149"
    : currentRun?.status === "in_progress"
    ? "#58a6ff"
    : "#8b949e";

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto" style={{ background: "#0d1117" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "#e6edf3" }}>Pipeline Monitor</h2>
          <p className="text-xs mt-0.5" style={{ color: "#8b949e" }}>{activeRepo.fullName}</p>
        </div>
        <div className="flex items-center gap-3">
          {rateLimit && rateLimit.remaining < 100 && (
            <span className="badge badge-failure font-mono text-xs">
              ⚠ API quota: {rateLimit.remaining} left
            </span>
          )}
          <button
            onClick={refreshRuns}
            disabled={isLoadingRuns}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono"
            style={{ background: "#161b22", border: "1px solid #30363d", color: "#8b949e" }}
          >
            {isLoadingRuns ? (
              <Loader2 size={12} className="spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            Refresh
          </button>
        </div>
      </div>

      {runsError && (
        <div className="mb-4 px-3 py-2 rounded text-xs font-mono" style={{ background: "rgba(248,81,73,0.1)", color: "#f85149", border: "1px solid rgba(248,81,73,0.3)" }}>
          {runsError}
        </div>
      )}

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="card p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: "#8b949e" }}>{m.label}</span>
              <m.icon size={14} style={{ color: m.color }} />
            </div>
            <p className="font-mono text-lg font-semibold" style={{ color: m.color }}>
              {m.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: "#e6edf3" }}>Pipeline Progress</span>
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-xs px-2 py-0.5 rounded"
              style={{ background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}30` }}
            >
              {statusLabel}
            </span>
            <span className="font-mono text-xs" style={{ color: "#8b949e" }}>
              {completionPct}%
            </span>
          </div>
        </div>
        <div className="progress-bar-track">
          <motion.div
            className="progress-bar-fill"
            initial={{ width: "0%" }}
            animate={{ width: `${completionPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="font-mono text-xs" style={{ color: "#6e7681" }}>
            {currentJobs.filter((j) => j.status === "completed").length} / {currentJobs.length} jobs
          </span>
          {currentRun && (
            <span className="font-mono text-xs" style={{ color: "#6e7681" }}>
              {relativeTime(currentRun.created_at)}
            </span>
          )}
        </div>
      </div>

      {/* Jobs list */}
      {currentJobs.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "#e6edf3" }}>
            <Zap size={14} style={{ color: "#58a6ff" }} />
            Current Jobs
          </h3>
          <div className="space-y-2">
            {currentJobs.map((job) => {
              const c = job.conclusion === "success" ? "#3fb950"
                : job.conclusion === "failure" ? "#f85149"
                : job.status === "in_progress" ? "#58a6ff"
                : "#6e7681";
              return (
                <div key={job.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid #21262d" }}>
                  <span className="font-mono text-xs" style={{ color: "#e6edf3" }}>{job.name}</span>
                  <div className="flex items-center gap-3">
                    {job.durationSeconds != null && (
                      <span className="font-mono text-xs" style={{ color: "#6e7681" }}>
                        {fmtDuration(job.durationSeconds)}
                      </span>
                    )}
                    <span className="font-mono text-xs" style={{ color: c }}>
                      {job.status === "in_progress" ? "running" : job.conclusion ?? "pending"}
                    </span>
                    <a href={job.html_url} target="_blank" rel="noreferrer">
                      <ExternalLink size={11} style={{ color: "#6e7681" }} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
