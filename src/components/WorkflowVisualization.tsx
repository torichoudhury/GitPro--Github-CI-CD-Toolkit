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
  ExternalLink,
  Cpu,
  Terminal,
  Activity,
  ArrowRight,
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
  { id: "build", label: "Environment & Build", icon: Hammer },
  { id: "lint", label: "Quality Checks",  icon: Zap },
  { id: "test", label: "Automated Testing",  icon: FlaskConical },
  { id: "deploy", label: "Staging & Production", icon: Rocket },
];

function stageColors(status: StageStatus) {
  switch (status) {
    case "success":     return { border: "border-green-500/30", bg: "bg-green-500/5", glow: "green-500", text: "text-green-400" };
    case "failure":     return { border: "border-red-500/30", bg: "bg-red-500/5", glow: "red-500", text: "text-red-400" };
    case "in_progress": return { border: "border-blue-500/40", bg: "bg-blue-500/10", glow: "blue-500", text: "text-blue-400" };
    default:            return { border: "border-white/5", bg: "bg-white/[0.02]", glow: "white", text: "text-tertiary" };
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
      <>
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           onClick={onClose}
           className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
        />
        <motion.div
          key="drawer"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
          className="absolute top-0 right-0 h-full w-[400px] z-50 glass-panel border-l border-white/10 shadow-2xl flex flex-col"
        >
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <Terminal size={18} />
               </div>
               <div>
                  <h4 className="text-sm font-bold text-white leading-none whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">{job.name}</h4>
                  <p className="text-[10px] text-tertiary uppercase font-black mt-1">Live Runtime Inspect</p>
               </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-tertiary hover:text-white transition-all">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {job.steps.length === 0 && (
              <div className="py-12 text-center opacity-30 select-none">
                 <Cpu size={48} className="mx-auto mb-4" />
                 <p className="text-xs font-black uppercase tracking-widest">No Runtime Data</p>
              </div>
            )}
            {job.steps.map((step) => (
              <motion.div 
                key={step.number} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                     <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${step.conclusion === 'success' ? 'bg-green-500' : step.conclusion === 'failure' ? 'bg-red-500' : 'bg-blue-400 animate-pulse'}`} />
                     <span className="font-mono text-xs font-bold text-secondary uppercase tracking-tight truncate">{step.name}</span>
                  </div>
                  <span
                    className="font-mono text-[10px] font-black uppercase whitespace-nowrap"
                    style={{
                      color:
                        step.conclusion === "success"
                          ? "#4ade80"
                          : step.conclusion === "failure"
                          ? "#f87171"
                          : step.status === "in_progress"
                          ? "#60a5fa"
                          : "#6e7681",
                    }}
                  >
                    {step.status === "in_progress" ? "executing" : step.conclusion ?? "pending"}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="p-6 border-t border-white/5 bg-black/20">
            {job.html_url && (
              <a
                href={job.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 flex items-center justify-center gap-2 primary rounded-xl group"
              >
                <span className="text-xs font-black uppercase tracking-widest">Global Full Log</span>
                <ExternalLink size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            )}
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// ── Main Component ────────────────────────────────────────────────────────────

export const WorkflowVisualization: React.FC = () => {
  const { currentRun, currentJobs, isLoadingRuns, runsError, activeRepo } =
    useCIPipeline();

  const [selectedJob, setSelectedJob] = useState<WorkflowJob | null>(null);

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

  if (!activeRepo) return null;

  return (
    <div className="h-full flex flex-col gap-10 fade-in relative overflow-hidden">
      {/* Header */}
      <div className="px-2">
         <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Stage Visualization</h2>
         <div className="flex items-center gap-2 group cursor-default">
            <Activity size={14} className="text-blue-400" />
            <p className="text-sm font-medium text-secondary group-hover:text-white transition-colors">Architecture Overview for {activeRepo.fullName}</p>
         </div>
      </div>

      {runsError && (
        <div className="p-4 rounded-xl bg-red-400/10 border border-red-400/20 text-red-100 flex items-center gap-3">
          <AlertCircle size={18} className="text-red-400" />
          <span className="text-sm font-medium">{runsError}</span>
        </div>
      )}

      {/* Modern Stage Graph */}
      <div className="flex flex-col xl:flex-row items-center gap-6 justify-center py-10 perspective-1000">
        {stages.map((stage, i) => {
          const colors = stageColors(stage.status);
          const isActive = stage.status === "in_progress";
          const isSuccess = stage.status === "success";
          const isFailure = stage.status === "failure";

          return (
            <React.Fragment key={stage.id}>
              <motion.div
                initial={{ opacity: 0, rotateY: -30, x: -20 }}
                animate={{ opacity: 1, rotateY: 0, x: 0 }}
                transition={{ delay: i * 0.15, type: "spring", stiffness: 100 }}
                onClick={() => stage.job && setSelectedJob(stage.job)}
                className={`flex-1 min-w-[240px] max-w-[280px] p-6 rounded-[32px] border transition-all duration-500 cursor-pointer relative group ${colors.border} ${colors.bg} ${isActive ? 'ring-2 ring-blue-500/20 shadow-2xl shadow-blue-500/10' : ''}`}
                whileHover={{ scale: 1.05, translateY: -8 }}
              >
                {/* Visual Feedback */}
                {isActive && (
                   <div className="absolute inset-0 bg-blue-500/5 blur-[40px] animate-pulse rounded-[32px]" />
                )}
                
                <div className="relative z-10">
                   <div className={`p-4 w-16 h-16 rounded-2xl mb-6 flex items-center justify-center transition-all duration-500 ${isSuccess ? 'bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20' : isFailure ? 'bg-red-500/20 text-red-400 shadow-lg shadow-red-500/20' : isActive ? 'bg-blue-500/20 text-blue-400 shadow-xl shadow-blue-500/20' : 'bg-white/5 text-tertiary'}`}>
                      <stage.icon size={32} strokeWidth={isSuccess || isActive ? 2.5 : 1.5} />
                   </div>
                   
                   <h3 className="text-lg font-bold text-white mb-2 tracking-tight">{stage.label}</h3>
                   
                   <div className="flex items-center gap-3 mb-6">
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${colors.text} ${colors.border}`}>
                         <StageIcon status={stage.status} size={10} /> {stage.status.replace("_", " ")}
                      </div>
                      {stage.job?.durationSeconds != null && (
                        <span className="text-[10px] font-mono font-bold text-tertiary tracking-tighter uppercase">{fmtSeconds(stage.job.durationSeconds)} EXECTIME</span>
                      )}
                   </div>

                   <div className="flex items-center justify-between pt-4 border-t border-white/5 opacity-40 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-black text-tertiary uppercase tracking-widest">{stage.job ? 'Inspect Trace' : 'Awaiting Link'}</span>
                      <ArrowRight size={14} className="text-tertiary group-hover:translate-x-1 transition-transform" />
                   </div>
                </div>
              </motion.div>

              {i < stages.length - 1 && (
                <div className="hidden xl:flex items-center py-4">
                  <motion.div
                    animate={hasActiveTransition ? { opacity: [0.2, 0.6, 0.2] } : { opacity: 0.2 }}
                    transition={hasActiveTransition ? { repeat: Infinity, duration: 1.5 } : {}}
                    className={`flex items-center gap-1 ${hasActiveTransition ? 'text-blue-400' : 'text-tertiary'}`}
                  >
                    <ChevronRight size={24} />
                    <ChevronRight size={24} className="-ml-4 opacity-50" />
                  </motion.div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Metadata Environment Context */}
      {currentRun && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 card p-6 bg-white/[0.01] border-white/5 flex items-center justify-between flex-wrap gap-6"
        >
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-tertiary uppercase mb-1">Execution Pipeline</span>
              <span className="text-xs font-bold text-blue-400 font-mono tracking-tight">#{currentRun.run_number} <span className="opacity-40 ml-1">· {currentRun.head_branch}</span></span>
            </div>
            <div className="w-px h-8 bg-white/5" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-tertiary uppercase mb-1">System Trigger</span>
              <span className="text-xs font-bold text-white uppercase tracking-tight">{currentRun.event}</span>
            </div>
          </div>
          {isLoadingRuns && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-blue-500/5 border border-blue-500/10">
               <Loader2 size={16} className="spin text-blue-400" />
               <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Polling Live Buffer...</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Log Drawer Overlay */}
      <LogDrawer job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
};

const AlertCircle = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
