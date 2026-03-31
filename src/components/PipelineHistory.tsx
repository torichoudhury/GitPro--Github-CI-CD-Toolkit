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
  Calendar,
  Layers,
  History as HistoryIcon,
  RefreshCw,
} from "lucide-react";
import { useCIPipeline } from "../contexts/CIPipelineContext";
import type { WorkflowRun, WorkflowJob } from "../types";

const PAGE_SIZE = 8;

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
  const isRunning = run.status === "in_progress" || run.status === "queued";
  if (isRunning) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 uppercase tracking-tighter">
        <Loader2 size={10} className="spin" /> Running
      </div>
    );
  }
  
  const isSuccess = run.conclusion === "success";
  const isFailure = run.conclusion === "failure";
  
  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-tighter ${
      isSuccess ? 'bg-green-500/10 border-green-500/20 text-green-400' : 
      isFailure ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
      'bg-white/5 border-white/10 text-tertiary'
    }`}>
      {isSuccess ? <CheckCircle size={10} /> : isFailure ? <XCircle size={10} /> : <Clock size={10} />}
      {run.conclusion ?? run.status}
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
    if (jobsMap[run.id]) return;

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

  if (!activeRepo) return null;

  return (
    <div className="h-full flex flex-col gap-8 fade-in">
      {/* Header */}
      <div className="flex items-end justify-between px-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Run History</h2>
          <div className="flex items-center gap-2 group cursor-default">
            <HistoryIcon size={14} className="text-blue-400" />
            <p className="text-sm font-medium text-secondary group-hover:text-white transition-colors">Archive for {activeRepo.fullName}</p>
          </div>
        </div>
        
        <button
          onClick={refreshRuns}
          disabled={isLoadingRuns}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-secondary hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
        >
          {isLoadingRuns ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
          Refresh Log
        </button>
      </div>

      {/* Modern List View */}
      <div className="flex-1 space-y-4">
        {pageRuns.map((run, i) => (
          <motion.div
            key={run.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`group rounded-2xl border transition-all duration-300 overflow-hidden ${
              expandedRunId === run.id 
                ? 'bg-white/5 border-blue-500/30 ring-1 ring-blue-500/10' 
                : 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]'
            }`}
          >
            <div 
              className="flex items-center justify-between p-5 cursor-pointer"
              onClick={() => handleExpand(run)}
            >
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-tertiary uppercase leading-none mb-1">RUN</span>
                  <span className="text-sm font-bold text-blue-400 font-mono tracking-tight">#{run.run_number}</span>
                </div>
                
                <div className="w-px h-10 bg-white/5" />
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{run.name}</span>
                    <StatusBadge run={run} />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-bold text-secondary uppercase tracking-tight">
                      <GitBranch size={10} className="text-blue-400" /> {run.head_branch}
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-bold text-tertiary uppercase tracking-tight">
                      <Calendar size={10} /> {relativeTime(run.created_at)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                 <div className="hidden sm:flex flex-col items-end">
                    <span className="text-[10px] font-black text-tertiary uppercase mb-1">DURATION</span>
                    <span className="text-xs font-bold font-mono text-white tracking-widest">{fmtDuration(run.durationSeconds)}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-tertiary transition-all">
                      <ExternalLink size={14} />
                    </button>
                    <div className={`p-1.5 rounded-lg transition-transform duration-300 ${expandedRunId === run.id ? 'rotate-180 bg-blue-500/20 text-blue-400' : 'text-tertiary'}`}>
                      <ChevronDown size={18} />
                    </div>
                 </div>
              </div>
            </div>

            {/* Jobs Details Overlay */}
            <AnimatePresence>
              {expandedRunId === run.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/5 bg-black/20"
                >
                  <div className="p-6">
                    {loadingJobId === run.id ? (
                      <div className="flex items-center gap-3 justify-center py-8">
                        <Loader2 size={16} className="spin text-blue-400" />
                        <span className="text-sm font-bold font-mono text-tertiary uppercase tracking-widest">Compiling job details...</span>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        <div className="flex items-center gap-2 mb-2">
                           <Layers size={12} className="text-tertiary" />
                           <h4 className="text-[10px] font-black text-tertiary uppercase tracking-widest">Workflow Tasks</h4>
                        </div>
                        {(jobsMap[run.id] ?? []).map((job) => (
                          <div key={job.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                            <div className="flex items-center gap-3">
                              <div className={`w-1.5 h-1.5 rounded-full ${job.conclusion === 'success' ? 'bg-green-500' : job.conclusion === 'failure' ? 'bg-red-500' : 'bg-blue-400 animate-pulse'}`} />
                              <span className="text-xs font-bold text-secondary uppercase tracking-tight">{job.name}</span>
                            </div>
                            <div className="flex items-center gap-6">
                              <span className="text-[10px] font-bold font-mono text-tertiary uppercase">{fmtDuration(job.durationSeconds)}</span>
                              <div className="w-px h-4 bg-white/5" />
                              <a href={job.html_url} target="_blank" rel="noreferrer" className="text-tertiary hover:text-white transition-colors">
                                <ExternalLink size={12} />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {pipelineRuns.length === 0 && !isLoadingRuns && (
          <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
            <HistoryIcon size={48} className="text-white/10 mb-4" />
            <p className="text-sm font-bold text-tertiary uppercase tracking-widest">No historical data detected</p>
          </div>
        )}
      </div>

      {/* Premium Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-6 border-t border-white/5">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-secondary hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          
          <div className="flex items-center gap-3">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-10 h-10 rounded-xl font-mono text-xs font-bold transition-all ${
                  page === i 
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                    : 'bg-white/5 text-secondary hover:bg-white/10 hover:text-white border border-white/10'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-secondary hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};
