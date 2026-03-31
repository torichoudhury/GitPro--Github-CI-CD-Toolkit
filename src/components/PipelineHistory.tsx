import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  GitBranch,
  ChevronLeft,
} from "lucide-react";
import { useCIPipeline } from "../contexts/CIPipelineContext";
import type { WorkflowRun, WorkflowJob } from "../types";

const PAGE_SIZE = 10;

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtDuration(s?: number) {
  if (s == null) return "—";
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function StatusBadge({ run }: { run: WorkflowRun }) {
  if (run.status === "in_progress" || run.status === "queued") {
    return <span className="badge badge-running">● running</span>;
  }
  switch (run.conclusion) {
    case "success":   return <span className="badge badge-success">✓ success</span>;
    case "failure":   return <span className="badge badge-failure">✗ failure</span>;
    case "cancelled": return <span className="badge badge-cancelled">⊘ cancelled</span>;
    default:          return <span className="badge badge-pending">○ {run.conclusion ?? run.status}</span>;
  }
}

function JobRow({ job }: { job: WorkflowJob }) {
  const c = job.conclusion === "success" ? "#3fb950"
    : job.conclusion === "failure" ? "#f85149"
    : job.status === "in_progress" ? "#58a6ff"
    : "#6e7681";
  return (
    <div
      className="flex items-center justify-between px-6 py-2"
      style={{ borderBottom: "1px solid #161b22" }}
    >
      <div className="flex items-center gap-2">
        {job.conclusion === "success" ? (
          <CheckCircle size={12} style={{ color: "#3fb950" }} />
        ) : job.conclusion === "failure" ? (
          <XCircle size={12} style={{ color: "#f85149" }} />
        ) : job.status === "in_progress" ? (
          <Loader2 size={12} className="spin" style={{ color: "#58a6ff" }} />
        ) : (
          <Clock size={12} style={{ color: "#6e7681" }} />
        )}
        <span className="font-mono text-xs" style={{ color: "#8b949e" }}>{job.name}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs" style={{ color: c }}>
          {job.status === "in_progress" ? "running" : job.conclusion ?? "pending"}
        </span>
        <span className="font-mono text-xs" style={{ color: "#6e7681" }}>
          {fmtDuration(job.durationSeconds)}
        </span>
        <a href={job.html_url} target="_blank" rel="noreferrer">
          <ExternalLink size={11} style={{ color: "#6e7681" }} />
        </a>
      </div>
    </div>
  );
}

export const PipelineHistory: React.FC = () => {
  const { pipelineRuns, isLoadingRuns, activeRepo, refreshRuns } = useCIPipeline();
  const [page, setPage] = useState(0);
  const [expandedRunId, setExpandedRunId] = useState<number | null>(null);
  const [jobsMap, setJobsMap] = useState<Record<number, WorkflowJob[]>>({});
  const [loadingJobId, setLoadingJobId] = useState<number | null>(null);

  const totalPages = Math.ceil(pipelineRuns.length / PAGE_SIZE);
  const pageRuns = pipelineRuns.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleExpand = async (run: WorkflowRun) => {
    if (expandedRunId === run.id) {
      setExpandedRunId(null);
      return;
    }
    setExpandedRunId(run.id);
    if (jobsMap[run.id]) return; // already loaded

    setLoadingJobId(run.id);
    try {
      const { getWorkflowJobs } = await import("../services/githubAPIService");
      const jobs = await getWorkflowJobs(activeRepo!.fullName, run.id);
      setJobsMap((prev) => ({ ...prev, [run.id]: jobs }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingJobId(null);
    }
  };

  if (!activeRepo) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm" style={{ color: "#8b949e" }}>Select a repository in Settings.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: "#0d1117" }}>
      {/* Header */}
      <div className="flex items-center justify-between p-6" style={{ borderBottom: "1px solid #21262d" }}>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "#e6edf3" }}>Run History</h2>
          <p className="text-xs mt-0.5" style={{ color: "#8b949e" }}>{activeRepo.fullName}</p>
        </div>
        <button
          onClick={refreshRuns}
          disabled={isLoadingRuns}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono"
          style={{ background: "#161b22", border: "1px solid #30363d", color: "#8b949e" }}
        >
          {isLoadingRuns ? <Loader2 size={12} className="spin" /> : null}
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid #21262d" }}>
              {["#", "Branch", "Event", "Status", "Duration", "Time", ""].map((h) => (
                <th
                  key={h}
                  className="py-2 px-3 text-left font-mono text-xs"
                  style={{ color: "#6e7681", background: "#0d1117", position: "sticky", top: 0 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRuns.map((run) => (
              <React.Fragment key={run.id}>
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="cursor-pointer"
                  onClick={() => handleExpand(run)}
                  style={{
                    borderBottom: "1px solid #161b22",
                    background: expandedRunId === run.id ? "#161b22" : "transparent",
                  }}
                  whileHover={{ backgroundColor: "#161b22" }}
                >
                  <td className="py-2 px-3 font-mono text-xs" style={{ color: "#58a6ff" }}>
                    #{run.run_number}
                  </td>
                  <td className="py-2 px-3 font-mono text-xs" style={{ color: "#3fb950" }}>
                    <div className="flex items-center gap-1">
                      <GitBranch size={11} />
                      {run.head_branch}
                    </div>
                  </td>
                  <td className="py-2 px-3 font-mono text-xs" style={{ color: "#8b949e" }}>
                    {run.event}
                  </td>
                  <td className="py-2 px-3">
                    <StatusBadge run={run} />
                  </td>
                  <td className="py-2 px-3 font-mono text-xs" style={{ color: "#8b949e" }}>
                    {fmtDuration(run.durationSeconds)}
                  </td>
                  <td className="py-2 px-3 font-mono text-xs" style={{ color: "#6e7681" }}>
                    {relativeTime(run.created_at)}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      {expandedRunId === run.id ? (
                        <ChevronDown size={14} style={{ color: "#6e7681" }} />
                      ) : (
                        <ChevronRight size={14} style={{ color: "#6e7681" }} />
                      )}
                      <a href={run.html_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                        <ExternalLink size={12} style={{ color: "#6e7681" }} />
                      </a>
                    </div>
                  </td>
                </motion.tr>

                {/* Expanded jobs */}
                <AnimatePresence>
                  {expandedRunId === run.id && (
                    <tr>
                      <td colSpan={7} style={{ padding: 0 }}>
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{ background: "#161b22", overflow: "hidden" }}
                        >
                          {loadingJobId === run.id ? (
                            <div className="flex items-center gap-2 px-6 py-3">
                              <Loader2 size={12} className="spin" style={{ color: "#58a6ff" }} />
                              <span className="font-mono text-xs" style={{ color: "#8b949e" }}>Loading jobs…</span>
                            </div>
                          ) : (jobsMap[run.id] ?? []).length === 0 ? (
                            <p className="font-mono text-xs px-6 py-3" style={{ color: "#6e7681" }}>No jobs found.</p>
                          ) : (
                            (jobsMap[run.id] ?? []).map((job) => (
                              <JobRow key={job.id} job={job} />
                            ))
                          )}
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {pipelineRuns.length === 0 && !isLoadingRuns && (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm" style={{ color: "#6e7681" }}>No runs found for this repository.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4" style={{ borderTop: "1px solid #21262d" }}>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded font-mono text-xs disabled:opacity-40"
            style={{ background: "#161b22", border: "1px solid #30363d", color: "#8b949e" }}
          >
            <ChevronLeft size={12} /> Prev
          </button>
          <span className="font-mono text-xs" style={{ color: "#6e7681" }}>
            Page {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded font-mono text-xs disabled:opacity-40"
            style={{ background: "#161b22", border: "1px solid #30363d", color: "#8b949e" }}
          >
            Next <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
};
