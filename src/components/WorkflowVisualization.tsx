import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hammer,
  Zap,
  FlaskConical,
  Rocket,
  ChevronRight,
  X,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { useCIPipeline } from "../contexts/CIPipelineContext";
import type { PipelineStage, WorkflowJob, StageStatus } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function conclusionToStatus(
  status: string,
  conclusion: string | null
): StageStatus {
  if (status === "in_progress" || status === "queued") return "in_progress";
  if (conclusion === "success") return "success";
  if (conclusion === "failure" || conclusion === "timed_out") return "failure";
  return "pending";
}

const STAGE_DEFS = [
  { id: "build", label: "Build", Icon: Hammer },
  { id: "lint", label: "Lint",  Icon: Zap },
  { id: "test", label: "Test",  Icon: FlaskConical },
  { id: "deploy", label: "Deploy", Icon: Rocket },
];

function stageColor(status: StageStatus) {
  switch (status) {
    case "success":     return { border: "#3fb950", bg: "rgba(63,185,80,0.12)",  text: "#3fb950" };
    case "failure":     return { border: "#f85149", bg: "rgba(248,81,73,0.12)",  text: "#f85149" };
    case "in_progress": return { border: "#58a6ff", bg: "rgba(88,166,255,0.12)", text: "#58a6ff" };
    default:            return { border: "#30363d", bg: "rgba(110,118,129,0.08)", text: "#6e7681" };
  }
}

function StageIcon({ status, size = 20 }: { status: StageStatus; size?: number }) {
  if (status === "success")     return <CheckCircle size={size} />;
  if (status === "failure")     return <XCircle size={size} />;
  if (status === "in_progress") return <Loader2 size={size} className="spin" />;
  return <Clock size={size} />;
}

function fmtSeconds(s?: number) {
  if (s == null) return "";
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

// ── Log Drawer ────────────────────────────────────────────────────────────────

const LogDrawer: React.FC<{ job: WorkflowJob | null; onClose: () => void }> = ({
  job,
  onClose,
}) => (
  <AnimatePresence>
    {job && (
      <motion.div
        key="drawer"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="absolute top-0 right-0 h-full w-80 z-50"
        style={{ background: "#0d1117", borderLeft: "1px solid #30363d" }}
      >
        <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid #30363d" }}>
          <span className="font-mono text-sm" style={{ color: "#58a6ff" }}>{job.name}</span>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="p-3 overflow-y-auto" style={{ maxHeight: "calc(100% - 56px)" }}>
          {job.steps.length === 0 && (
            <p className="text-xs text-gray-500 font-mono">No steps available.</p>
          )}
          {job.steps.map((step) => (
            <div key={step.number} className="mb-2 p-2 rounded" style={{ background: "#161b22", border: "1px solid #30363d" }}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs" style={{ color: "#e6edf3" }}>{step.name}</span>
                <span
                  className="font-mono text-xs"
                  style={{
                    color:
                      step.conclusion === "success"
                        ? "#3fb950"
                        : step.conclusion === "failure"
                        ? "#f85149"
                        : step.status === "in_progress"
                        ? "#58a6ff"
                        : "#6e7681",
                  }}
                >
                  {step.status === "in_progress" ? "running" : step.conclusion ?? "pending"}
                </span>
              </div>
            </div>
          ))}

          {job.html_url && (
            <a
              href={job.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block text-center text-xs font-mono py-2 rounded"
              style={{ color: "#58a6ff", border: "1px solid #30363d", background: "#161b22" }}
            >
              View full log on GitHub ↗
            </a>
          )}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ── Arrow between stages ──────────────────────────────────────────────────────

const Arrow: React.FC<{ active: boolean }> = ({ active }) => (
  <ChevronRight
    size={20}
    className={active ? "arrow-pulse" : ""}
    style={{ color: active ? "#58a6ff" : "#30363d", flexShrink: 0 }}
  />
);

// ── Main Component ────────────────────────────────────────────────────────────

export const WorkflowVisualization: React.FC = () => {
  const { currentRun, currentJobs, isLoadingRuns, runsError, activeRepo } =
    useCIPipeline();

  const [selectedJob, setSelectedJob] = useState<WorkflowJob | null>(null);

  // Map jobs to STAGE_DEFS by fuzzy name matching
  const stages: PipelineStage[] = STAGE_DEFS.map((def) => {
    const job = currentJobs.find((j) =>
      j.name.toLowerCase().includes(def.id)
    );
    const status: StageStatus = job
      ? conclusionToStatus(job.status, job.conclusion)
      : "pending";
    return { ...def, status, job };
  });

  const hasActiveTransition = stages.some((s) => s.status === "in_progress");

  if (!activeRepo) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500 text-sm">Add a repository in Settings to get started.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 relative overflow-hidden" style={{ background: "#0d1117" }}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold" style={{ color: "#e6edf3" }}>
          Pipeline Visualization
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "#8b949e" }}>
          {activeRepo.fullName} — live CI/CD stages
        </p>
      </div>

      {runsError && (
        <div className="mb-4 px-3 py-2 rounded text-xs font-mono" style={{ background: "rgba(248,81,73,0.1)", color: "#f85149", border: "1px solid rgba(248,81,73,0.3)" }}>
          {runsError}
        </div>
      )}

      {/* Stage diagram */}
      <div className="flex items-stretch gap-2 flex-1 overflow-x-auto pb-2">
        {stages.map((stage, i) => {
          const colors = stageColor(stage.status);
          const isActive = stage.status === "in_progress";
          return (
            <React.Fragment key={stage.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                onClick={() => stage.job && setSelectedJob(stage.job)}
                className={`flex-1 rounded-lg p-4 flex flex-col items-center justify-center gap-3 cursor-pointer min-w-[120px] ${isActive ? "stage-active" : ""}`}
                style={{
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  transition: "transform 0.15s",
                }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <div style={{ color: colors.text }}>
                  <stage.Icon size={32} />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm" style={{ color: "#e6edf3" }}>{stage.label}</p>
                  <div className="flex items-center gap-1 justify-center mt-1" style={{ color: colors.text }}>
                    <StageIcon status={stage.status} size={12} />
                    <span className="font-mono text-xs">{stage.status.replace("_", " ")}</span>
                  </div>
                  {stage.job?.durationSeconds != null && (
                    <p className="font-mono text-xs mt-1" style={{ color: "#6e7681" }}>
                      {fmtSeconds(stage.job.durationSeconds)}
                    </p>
                  )}
                </div>
                {stage.job && (
                  <span className="text-xs" style={{ color: "#6e7681" }}>click for logs</span>
                )}
              </motion.div>

              {i < stages.length - 1 && (
                <div className="flex items-center">
                  <Arrow active={hasActiveTransition} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Run info footer */}
      {currentRun && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 flex items-center gap-4 flex-wrap"
          style={{ borderTop: "1px solid #30363d", paddingTop: 12 }}
        >
          <span className="font-mono text-xs" style={{ color: "#8b949e" }}>
            Run <span style={{ color: "#58a6ff" }}>#{currentRun.run_number}</span>
          </span>
          <span className="font-mono text-xs" style={{ color: "#8b949e" }}>
            Branch: <span style={{ color: "#3fb950" }}>{currentRun.head_branch}</span>
          </span>
          <span className="font-mono text-xs" style={{ color: "#8b949e" }}>
            Trigger: {currentRun.event}
          </span>
          {isLoadingRuns && (
            <Loader2 size={12} className="spin" style={{ color: "#58a6ff" }} />
          )}
        </motion.div>
      )}

      {/* Log Drawer */}
      <LogDrawer job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
};
