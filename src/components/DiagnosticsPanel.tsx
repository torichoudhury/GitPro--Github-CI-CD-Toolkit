import React from "react";
import { motion } from "framer-motion";
import {
  GitMerge,
  AlertTriangle,
  Leaf,
  RefreshCw,
  Loader2,
  Info,
} from "lucide-react";
import { useCIPipeline } from "../contexts/CIPipelineContext";

function riskColor(score: number) {
  if (score < 0.33) return "#3fb950";
  if (score < 0.67) return "#d29922";
  return "#f85149";
}

function divergenceColor(behind: number) {
  if (behind <= 2) return { color: "#3fb950", label: "Low risk" };
  if (behind <= 10) return { color: "#d29922", label: "Medium risk" };
  return { color: "#f85149", label: "High risk" };
}

function relDays(iso: string) {
  const d = Math.floor(
    (Date.now() - new Date(iso).getTime()) / 86400000
  );
  return d === 0 ? "today" : `${d}d ago`;
}

export const DiagnosticsPanel: React.FC = () => {
  const {
    diagnostics,
    isLoadingDiagnostics,
    refreshDiagnostics,
    activeRepo,
  } = useCIPipeline();

  if (!activeRepo) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm" style={{ color: "#8b949e" }}>Select a repository in Settings.</p>
      </div>
    );
  }

  const div = diagnostics?.divergence;
  const divInfo = div ? divergenceColor(div.behind) : null;

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto gap-4" style={{ background: "#0d1117" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "#e6edf3" }}>Diagnostics</h2>
          <p className="text-xs mt-0.5" style={{ color: "#8b949e" }}>
            {activeRepo.fullName}
            {diagnostics?.refreshedAt && (
              <> · refreshed {relDays(diagnostics.refreshedAt)}</>
            )}
          </p>
        </div>
        <button
          onClick={refreshDiagnostics}
          disabled={isLoadingDiagnostics}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono"
          style={{ background: "#161b22", border: "1px solid #30363d", color: "#8b949e" }}
        >
          {isLoadingDiagnostics ? (
            <Loader2 size={12} className="spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          Refresh
        </button>
      </div>

      {/* Branch Divergence */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <GitMerge size={16} style={{ color: "#58a6ff" }} />
          <h3 className="font-semibold text-sm" style={{ color: "#e6edf3" }}>Branch Divergence</h3>
        </div>

        {div ? (
          <>
            <div className="flex items-center gap-6 mb-3">
              <div className="text-center">
                <p className="font-mono text-2xl font-bold" style={{ color: "#3fb950" }}>
                  {div.ahead}
                </p>
                <p className="text-xs" style={{ color: "#8b949e" }}>ahead</p>
              </div>
              <div className="font-mono text-lg" style={{ color: "#30363d" }}>|</div>
              <div className="text-center">
                <p
                  className="font-mono text-2xl font-bold"
                  style={{ color: divInfo!.color }}
                >
                  {div.behind}
                </p>
                <p className="text-xs" style={{ color: "#8b949e" }}>behind</p>
              </div>
              <div
                className="px-2 py-1 rounded text-xs font-mono ml-auto"
                style={{
                  background: `${divInfo!.color}20`,
                  color: divInfo!.color,
                  border: `1px solid ${divInfo!.color}30`,
                }}
              >
                {divInfo!.label}
              </div>
            </div>
            <p className="text-xs" style={{ color: "#6e7681" }}>
              Comparing <span style={{ color: "#58a6ff" }}>{div.currentBranch}</span> vs{" "}
              <span style={{ color: "#3fb950" }}>{div.baseBranch}</span>
            </p>
          </>
        ) : (
          <p className="text-xs" style={{ color: "#6e7681" }}>
            {isLoadingDiagnostics ? "Fetching divergence…" : "Divergence data unavailable."}
          </p>
        )}
      </motion.div>

      {/* Conflict Risk Map */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} style={{ color: "#d29922" }} />
          <h3 className="font-semibold text-sm" style={{ color: "#e6edf3" }}>Conflict Risk Map</h3>
          <div className="ml-auto flex items-center gap-1" title="Files changed in this branch also recently edited by others">
            <Info size={12} style={{ color: "#6e7681" }} />
          </div>
        </div>

        {diagnostics?.conflictFiles && diagnostics.conflictFiles.length > 0 ? (
          <div className="space-y-3 max-h-52 overflow-y-auto">
            {diagnostics.conflictFiles.map((f) => (
              <div key={f.filename}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs truncate max-w-[55%]" style={{ color: "#e6edf3" }}>
                    {f.filename}
                  </span>
                  <span className="font-mono text-xs" style={{ color: riskColor(f.riskScore) }}>
                    {Math.round(f.riskScore * 100)}% risk
                  </span>
                </div>
                <div className="risk-bar-bg">
                  <motion.div
                    className="risk-bar-fill"
                    initial={{ width: "0%" }}
                    animate={{ width: `${f.riskScore * 100}%` }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    style={{ background: riskColor(f.riskScore) }}
                  />
                </div>
                {f.recentEditors.length > 0 && (
                  <p className="text-xs mt-1" style={{ color: "#6e7681" }}>
                    Also edited by:{" "}
                    {f.recentEditors.slice(0, 3).map((e) => (
                      <span key={e.login} style={{ color: "#8b949e" }}>
                        {e.login} ({e.daysAgo}d ago){" "}
                      </span>
                    ))}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs" style={{ color: "#6e7681" }}>
            {isLoadingDiagnostics
              ? "Analyzing files…"
              : "No conflict-prone files detected."}
          </p>
        )}
      </motion.div>

      {/* Stale Branches */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Leaf size={16} style={{ color: "#3fb950" }} />
          <h3 className="font-semibold text-sm" style={{ color: "#e6edf3" }}>Stale Branches</h3>
          {diagnostics?.staleBranches && diagnostics.staleBranches.length > 0 && (
            <span className="badge badge-failure ml-auto">
              {diagnostics.staleBranches.length}
            </span>
          )}
        </div>

        {diagnostics?.staleBranches && diagnostics.staleBranches.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {diagnostics.staleBranches.map((b) => (
              <div
                key={b.name}
                className="flex items-start justify-between p-2 rounded"
                style={{ background: "#0d1117", border: "1px solid #21262d" }}
              >
                <div>
                  <p className="font-mono text-xs" style={{ color: "#e6edf3" }}>{b.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#6e7681" }}>
                    Last commit by <span style={{ color: "#8b949e" }}>{b.author}</span> · {b.daysInactive} days ago
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#d29922" }}>
                    ⚠ This branch may be abandoned. Consider merging or deleting it.
                  </p>
                </div>
                <span className="font-mono text-xs ml-3 whitespace-nowrap" style={{ color: "#f85149" }}>
                  {b.daysInactive}d inactive
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs" style={{ color: "#6e7681" }}>
            {isLoadingDiagnostics ? "Scanning branches…" : "No stale branches detected. ✓"}
          </p>
        )}
      </motion.div>
    </div>
  );
};
