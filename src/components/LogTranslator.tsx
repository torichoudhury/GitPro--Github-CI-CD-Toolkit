import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Search, AlertCircle, Lightbulb, ExternalLink } from "lucide-react";
import { useCIPipeline } from "../contexts/CIPipelineContext";
import { analyzeLog } from "../services/logAnalysisService";
import { getJobLogs, getWorkflowJobs } from "../services/githubAPIService";
import type { WorkflowRun, WorkflowJob, LogAnalysisResult } from "../types";

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  dependency_error: { label: "Dependency Error", color: "#d29922" },
  test_failure:     { label: "Test Failure",     color: "#f85149" },
  lint_error:       { label: "Lint Error",        color: "#58a6ff" },
  env_missing:      { label: "Missing Env Var",  color: "#e3b341" },
  unknown:          { label: "Unknown Error",     color: "#8b949e" },
};

export const LogTranslator: React.FC = () => {
  const { pipelineRuns, activeRepo } = useCIPipeline();

  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<WorkflowJob | null>(null);
  const [fetchingJobs, setFetchingJobs] = useState(false);
  const [fetchingLog, setFetchingLog] = useState(false);
  const [analysis, setAnalysis] = useState<LogAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunChange = async (runId: string) => {
    const run = pipelineRuns.find((r) => r.id.toString() === runId) ?? null;
    setSelectedRun(run);
    setSelectedJob(null);
    setAnalysis(null);
    setJobs([]);
    if (!run || !activeRepo) return;

    setFetchingJobs(true);
    try {
      const j = await getWorkflowJobs(activeRepo.fullName, run.id);
      setJobs(j);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setFetchingJobs(false);
    }
  };

  const handleFetchLog = async () => {
    if (!selectedJob || !activeRepo) return;
    setFetchingLog(true);
    setAnalysis(null);
    setError(null);
    try {
      const raw = await getJobLogs(activeRepo.fullName, selectedJob.id);
      const result = analyzeLog(raw);
      setAnalysis(result);
    } catch (e: any) {
      setError(e.message ?? "Failed to fetch logs");
    } finally {
      setFetchingLog(false);
    }
  };

  if (!activeRepo) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm" style={{ color: "#8b949e" }}>Select a repository in Settings.</p>
      </div>
    );
  }

  const catInfo = analysis ? CATEGORY_LABELS[analysis.category] : null;

  return (
    <div className="h-full flex flex-col p-6 gap-4 overflow-y-auto" style={{ background: "#0d1117" }}>
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "#e6edf3" }}>Log Translator</h2>
        <p className="text-xs mt-0.5" style={{ color: "#8b949e" }}>
          Fetch a failed job log → get a plain-English root cause &amp; fix suggestion
        </p>
      </div>

      {/* Selectors */}
      <div className="flex gap-3 flex-wrap">
        <select
          className="flex-1 min-w-[200px]"
          onChange={(e) => handleRunChange(e.target.value)}
          defaultValue=""
          value={selectedRun?.id.toString() ?? ""}
        >
          <option value="" disabled>Select run…</option>
          {pipelineRuns.map((r) => (
            <option key={r.id} value={r.id.toString()}>
              #{r.run_number} · {r.head_branch} · {r.conclusion ?? r.status}
            </option>
          ))}
        </select>

        <select
          className="flex-1 min-w-[200px]"
          onChange={(e) =>
            setSelectedJob(jobs.find((j) => j.id.toString() === e.target.value) ?? null)
          }
          disabled={fetchingJobs || jobs.length === 0}
          value={selectedJob?.id.toString() ?? ""}
        >
          <option value="" disabled>Select job…</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id.toString()}>
              {j.name} ({j.conclusion ?? j.status})
            </option>
          ))}
        </select>

        <button
          onClick={handleFetchLog}
          disabled={!selectedJob || fetchingLog}
          className="flex items-center gap-2 px-4 py-2 rounded font-mono text-sm disabled:opacity-40"
          style={{ background: "#3fb950", color: "#0d1117", fontWeight: 600 }}
        >
          {fetchingLog ? (
            <Loader2 size={14} className="spin" />
          ) : (
            <Search size={14} />
          )}
          Fetch &amp; Analyze
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded text-xs font-mono" style={{ background: "rgba(248,81,73,0.1)", color: "#f85149", border: "1px solid rgba(248,81,73,0.3)" }}>
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Analysis result */}
      <AnimatePresence>
        {analysis && catInfo && (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Category + Fix */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <span
                  className="badge font-mono"
                  style={{ background: `${catInfo.color}20`, color: catInfo.color, border: `1px solid ${catInfo.color}30` }}
                >
                  {catInfo.label}
                </span>
                {selectedJob?.html_url && (
                  <a href={selectedJob.html_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-mono" style={{ color: "#58a6ff" }}>
                    View on GitHub <ExternalLink size={11} />
                  </a>
                )}
              </div>

              <div className="flex items-start gap-2 mb-3">
                <AlertCircle size={14} style={{ color: catInfo.color, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: "#e6edf3" }}>Root cause line</p>
                  <code className="font-mono text-xs break-all" style={{ color: catInfo.color }}>
                    {analysis.rootCauseLine || "(not found — check the log below)"}
                  </code>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded" style={{ background: "#161b22", border: "1px solid #30363d" }}>
                <Lightbulb size={14} style={{ color: "#3fb950", flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: "#3fb950" }}>Suggested fix</p>
                  <p className="text-xs" style={{ color: "#e6edf3" }}>{analysis.fixSuggestion}</p>
                </div>
              </div>
            </div>

            {/* Full log */}
            <div className="log-container" style={{ maxHeight: 280 }}>
              {analysis.lines.map((line, idx) =>
                idx === analysis.rootCauseLineIndex ? (
                  <span key={idx} className="log-line-highlight">
                    {`${idx + 1}`.padStart(4, " ")}  {line}{"\n"}
                  </span>
                ) : (
                  <span key={idx} style={{ display: "block" }}>
                    <span style={{ color: "#6e7681", userSelect: "none" }}>
                      {`${idx + 1}`.padStart(4, " ")}{"  "}
                    </span>
                    {line}
                    {"\n"}
                  </span>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
