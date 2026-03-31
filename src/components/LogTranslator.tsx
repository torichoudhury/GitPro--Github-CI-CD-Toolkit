import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, 
  Search, 
  AlertCircle, 
  Lightbulb, 
  ExternalLink, 
  Terminal, 
  Cpu, 
  Zap, 
  ArrowRight 
} from "lucide-react";
import { useCIPipeline } from "../contexts/CIPipelineContext";
import { analyzeLog } from "../services/logAnalysisService";
import {
  getJobLogs,
  getWorkflowJobs,
  getWorkflowRunLogs,
} from "../services/githubAPIService";
import type { WorkflowRun, WorkflowJob, LogAnalysisResult } from "../types";

const CATEGORY_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  dependency_error: { label: "Dependency Error", color: "#fbbf24", icon: Cpu },
  test_failure:     { label: "Test Failure",     color: "#f87171", icon: Zap },
  lint_error:       { label: "Lint Error",        color: "#60a5fa", icon: Search },
  env_missing:      { label: "Missing Env Var",  color: "#a78bfa", icon: AlertCircle },
  unknown:          { label: "Unknown Error",     color: "#94a3b8", icon: Terminal },
};

export const LogTranslator: React.FC = () => {
  const { pipelineRuns, activeRepo, repoInsights, isLoadingRepoInsights } = useCIPipeline();

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
    setError(null);
    if (!run || !activeRepo) return;

    setFetchingJobs(true);
    try {
      const j = await getWorkflowJobs(activeRepo.fullName, run.id);
      setJobs(j);
      const preferredJob =
        j.find((job) => job.conclusion === "failure") ??
        j.find((job) => job.status === "in_progress") ??
        j[0] ??
        null;
      setSelectedJob(preferredJob);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setFetchingJobs(false);
    }
  };

  useEffect(() => {
    if (!activeRepo) return;

    if (pipelineRuns.length === 0) {
      setSelectedRun(null);
      setSelectedJob(null);
      setJobs([]);
      return;
    }

    const stillExists = selectedRun
      ? pipelineRuns.some((run) => run.id === selectedRun.id)
      : false;

    if (stillExists) {
      return;
    }

    const preferredRun =
      pipelineRuns.find((run) => run.conclusion === "failure") ??
      pipelineRuns[0];

    void handleRunChange(preferredRun.id.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRepo?.fullName, pipelineRuns]);

  const handleFetchLog = async () => {
    if (!selectedJob || !activeRepo || !selectedRun) return;
    setFetchingLog(true);
    setAnalysis(null);
    setError(null);
    try {
      let raw = "";

      try {
        raw = await getJobLogs(activeRepo.fullName, selectedJob.id);
      } catch {
        // fallback to run-level logs if job endpoint is unavailable in current runtime
      }

      if (!raw || raw.trim().length < 20) {
        const runLogs = await getWorkflowRunLogs(activeRepo.fullName, selectedRun.id);
        const jobName = selectedJob.name.toLowerCase();
        const runLines = runLogs.split("\n");

        const indexedLines = runLines
          .map((line, index) => ({ line, index }))
          .filter(({ line }) => line.toLowerCase().includes(jobName));

        if (indexedLines.length > 0) {
          const pivot = indexedLines[0].index;
          const start = Math.max(0, pivot - 40);
          const end = Math.min(runLines.length, pivot + 220);
          raw = runLines.slice(start, end).join("\n");
        } else {
          raw = runLogs;
        }
      }

      if (!raw || !raw.trim()) {
        throw new Error("Log content is empty for this job/run.");
      }

      const result = await analyzeLog(raw);
      setAnalysis(result);
    } catch (e: any) {
      setError(e.message ?? "Failed to fetch logs");
    } finally {
      setFetchingLog(false);
    }
  };

  if (!activeRepo) return null;

  const catInfo = analysis ? CATEGORY_LABELS[analysis.category] : null;

  return (
    <div className="h-full flex flex-col gap-8 fade-in">
      {/* Header */}
      <div className="px-2">
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Log Translator</h2>
        <p className="text-sm font-medium text-secondary max-w-2xl">
          Instantly decode complex CI/CD logs into plain-English root causes and actionable fix suggestions for {activeRepo.fullName}.
        </p>
      </div>

      {/* Control Panel - Premium Glass */}
      <div className="card border-white/5 bg-white/[0.02] p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
          <div className="space-y-3">
             <label className="text-[10px] font-black text-tertiary uppercase tracking-widest px-1">Source Run</label>
             <select
              className="w-full bg-black/40 border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer"
              onChange={(e) => handleRunChange(e.target.value)}
              value={selectedRun?.id.toString() ?? ""}
              disabled={pipelineRuns.length === 0}
            >
              <option value="" disabled>Choose an execution...</option>
              {pipelineRuns.map((r) => (
                <option key={r.id} value={r.id.toString()}>
                  #{r.run_number} · {r.head_branch} · {r.conclusion ?? r.status}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
             <label className="text-[10px] font-black text-tertiary uppercase tracking-widest px-1">Specific Job</label>
             <select
              className="w-full bg-black/40 border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer disabled:opacity-30"
              onChange={(e) =>
                setSelectedJob(jobs.find((j) => j.id.toString() === e.target.value) ?? null)
              }
              disabled={fetchingJobs || jobs.length === 0}
              value={selectedJob?.id.toString() ?? ""}
            >
              <option value="" disabled>{fetchingJobs ? 'Fetching jobs...' : 'Choose a job task...'}</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id.toString()}>
                  {j.name} ({j.conclusion ?? j.status})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleFetchLog}
            disabled={!selectedJob || fetchingLog}
            className="h-[52px] primary w-full flex items-center justify-center gap-3 disabled:opacity-30 disabled:pointer-events-none group"
          >
            {fetchingLog ? (
              <Loader2 size={18} className="spin" />
            ) : (
              <Search size={18} className="transition-transform group-hover:scale-110" />
            )}
            <span className="uppercase text-xs font-black tracking-widest">Execute AI Analysis</span>
          </button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3"
            >
              <AlertCircle size={18} />
              <span className="text-xs font-bold font-mono tracking-tight">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Analysis Result - High-End Overlay */}
      <AnimatePresence>
        {analysis && catInfo && (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="space-y-8"
          >
            <div className="card relative overflow-hidden group">
               {/* Accent Glow */}
               <div className="absolute top-0 right-0 w-64 h-64 blur-[120px] opacity-10 pointer-events-none transition-opacity group-hover:opacity-20" style={{ background: catInfo.color }} />
               
               <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner" style={{ background: `${catInfo.color}10`, color: catInfo.color }}>
                      <catInfo.icon size={28} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-tertiary uppercase tracking-widest mb-1 block">DIAGNOSTIC CATEGORY</span>
                      <h3 className="text-xl font-bold text-white tracking-tight leading-none">{catInfo.label}</h3>
                    </div>
                  </div>
                  
                  {selectedJob?.html_url && (
                    <a href={selectedJob.html_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-white transition-colors bg-blue-500/5 hover:bg-blue-500/20 px-4 py-2 rounded-xl border border-blue-500/20">
                      OPEN REPO SOURCE <ExternalLink size={14} />
                    </a>
                  )}
               </div>

               <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <div className="space-y-3">
                     <div className="flex items-center gap-2 px-1">
                        <Terminal size={14} className="text-tertiary" />
                        <span className="text-[10px] font-black text-tertiary uppercase tracking-widest">Identified Root Cause</span>
                     </div>
                     <div className="p-5 rounded-2xl bg-black/40 border border-white/5 font-mono text-sm break-all leading-relaxed shadow-inner" style={{ color: catInfo.color }}>
                        {analysis.rootCauseLine || "(Failed to pinpoint specific line)"}
                     </div>
                  </div>

                  <div className="space-y-3">
                     <div className="flex items-center gap-2 px-1">
                        <Lightbulb size={14} className="text-green-400" />
                        <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Intelligence Recommendation</span>
                     </div>
                     <div className="p-5 rounded-2xl bg-green-500/5 border border-green-500/10 text-white text-sm leading-relaxed shadow-inner relative overflow-hidden group/fix">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-green-400/5 blur-3xl" />
                        <p className="relative z-10 transition-transform group-hover/fix:translate-x-1">{analysis.fixSuggestion}</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Detailed Terminal Log */}
            <div className="space-y-4">
               <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-tertiary" />
                    <h4 className="text-[10px] font-black text-tertiary uppercase tracking-widest">Extended Log Context</h4>
                  </div>
               </div>

               <div className="log-container border-white/5 shadow-2xl relative">
                  <div className="sticky top-0 right-0 p-4 opacity-10 pointer-events-none select-none">
                     <span className="font-black text-6xl text-white">LOGS</span>
                  </div>
                  <pre className="whitespace-pre-wrap">
                    {analysis.lines.map((line, idx) =>
                      idx === analysis.rootCauseLineIndex ? (
                        <div key={idx} className="log-line-highlight relative z-10">
                          <span className="w-10 opacity-30 inline-block font-mono select-none">{idx + 1}</span>
                          <span className="font-bold flex items-center gap-2">
                             <ArrowRight size={10} className="animate-pulse" /> {line}
                          </span>
                        </div>
                      ) : (
                        <div key={idx} className="hover:bg-white/5 transition-colors px-2">
                          <span className="w-10 opacity-20 inline-block font-mono select-none">{idx + 1}</span>
                          {line || ' '}
                        </div>
                      )
                    )}
                  </pre>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!analysis && !fetchingLog && (
        <div className="flex flex-col items-center justify-center py-24 bg-white/[0.02] rounded-[32px] border border-dashed border-white/10 mx-2">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
              <Terminal size={32} className="text-white/10" />
            </div>
            <h3 className="text-sm font-black text-tertiary uppercase tracking-[0.2em]">Ready for analysis</h3>
            {pipelineRuns.length > 0 ? (
              <p className="text-xs text-tertiary/60 mt-2 text-center max-w-xs font-medium">Select a failing workflow execution above to begin the AI-powered diagnostic process.</p>
            ) : (
              <div className="mt-2 text-center max-w-lg">
                <p className="text-xs text-tertiary/60 font-medium">
                  {isLoadingRepoInsights
                    ? "Loading repository activity..."
                    : "No workflow runs found yet for this repository. Push a workflow-enabled commit or trigger one manually to unlock log analysis."}
                </p>
                {repoInsights && (
                  <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
                    <a
                      href={`https://github.com/${repoInsights.fullName}/actions`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-bold text-blue-400 uppercase tracking-widest inline-flex items-center gap-1"
                    >
                      Open Actions <ExternalLink size={11} />
                    </a>
                    {repoInsights.commits[0] && (
                      <a
                        href={repoInsights.commits[0].htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-tertiary uppercase tracking-widest inline-flex items-center gap-1 hover:text-white"
                      >
                        Latest Commit <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
        </div>
      )}
    </div>
  );
};
