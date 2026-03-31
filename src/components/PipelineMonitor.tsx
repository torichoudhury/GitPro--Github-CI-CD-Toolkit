import React from "react";
import { motion } from "framer-motion";
import { 
  RefreshCw, 
  Loader2, 
  ExternalLink, 
  GitBranch, 
  GitCommit,
  Clock, 
  Hash, 
  Zap, 
  TrendingUp, 
  AlertCircle, 
  Activity 
} from "lucide-react";
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

function resetCountdown(resetAt: number) {
  const seconds = Math.max(0, resetAt - Math.floor(Date.now() / 1000));
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
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
    repoInsights,
    isLoadingRepoInsights,
  } = useCIPipeline();

  if (!activeRepo) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 text-center">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
          <GitBranch size={32} className="text-tertiary" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">No Repository Connected</h3>
        <p className="text-secondary max-w-sm">Select a repository in Settings to begin monitoring your CI/CD pipelines.</p>
      </div>
    );
  }

  // Compute success rate from last 10 runs
  const last10 = pipelineRuns.slice(0, 10);
  const successes = last10.filter((r) => r.conclusion === "success").length;
  const successRate = last10.length > 0 ? Math.round((successes / last10.length) * 100) : 0;

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
      color: "#60a5fa",
    },
    {
      label: "Trigger",
      value: currentRun
        ? `${currentRun.event} (${currentRun.head_branch})`
        : "—",
      icon: GitBranch,
      color: "#4ade80",
    },
    {
      label: "Duration",
      value: fmtDuration(currentRun?.durationSeconds),
      icon: Clock,
      color: "#fbbf24",
    },
    {
      label: "Success Rate",
      value: `${successRate}%`,
      icon: TrendingUp,
      color: successRate >= 70 ? "#4ade80" : successRate >= 40 ? "#fbbf24" : "#f87171",
    },
  ];

  const statusLabel = currentRun?.status === "in_progress"
    ? "in progress"
    : currentRun?.conclusion ?? "—";
  const apiUsagePct = rateLimit
    ? Math.round((rateLimit.remaining / Math.max(rateLimit.limit, 1)) * 100)
    : null;
  const jobBadges = currentJobs.slice(0, 3);

  return (
    <div className="h-full flex flex-col gap-8 fade-in">
      {/* Header Section */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Live Monitor</h2>
          <div className="flex items-center gap-2 group cursor-default">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-sm shadow-green-500/50" />
            <p className="text-sm font-medium text-secondary group-hover:text-white transition-colors">{activeRepo.fullName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={refreshRuns}
            disabled={isLoadingRuns}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-secondary hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
          >
            {isLoadingRuns ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            Sync Live Data
          </button>
        </div>
      </div>

      {runsError && (
        <div className="p-4 rounded-2xl bg-red-400/10 border border-red-400/20 text-red-100 flex items-center gap-3 shadow-lg shadow-red-500/5">
          <AlertCircle size={18} className="text-red-400" />
          <span className="text-sm font-medium">{runsError}</span>
        </div>
      )}

      {!currentRun && !isLoadingRuns && !runsError && (
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-secondary space-y-3">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-tertiary" />
            <span className="text-sm font-medium">No workflow runs found yet. Showing live repository activity instead.</span>
          </div>

          {isLoadingRepoInsights && (
            <div className="flex items-center gap-2 text-xs text-tertiary font-mono">
              <Loader2 size={12} className="spin" /> Loading repo insights...
            </div>
          )}

          {repoInsights && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-[10px] uppercase font-black tracking-widest text-tertiary mb-1">Repository</p>
                <p className="text-sm font-bold text-white truncate">{repoInsights.fullName}</p>
                <p className="text-[10px] text-tertiary mt-1 uppercase">{repoInsights.visibility} • {repoInsights.branchCount} branches</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-[10px] uppercase font-black tracking-widest text-tertiary mb-1">Workflows</p>
                <p className="text-sm font-bold text-white">{repoInsights.workflows.length} configured</p>
                <a
                  href={`https://github.com/${repoInsights.fullName}/actions`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-blue-400 uppercase font-bold tracking-widest mt-1 inline-flex items-center gap-1"
                >
                  open actions <ExternalLink size={10} />
                </a>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-[10px] uppercase font-black tracking-widest text-tertiary mb-1">Last Push</p>
                <p className="text-sm font-bold text-white">{relativeTime(repoInsights.pushedAt)}</p>
                <p className="text-[10px] text-tertiary mt-1 uppercase">default: {repoInsights.defaultBranch}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Metrics High-End Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
            className="card group relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 blur-[60px] opacity-20 pointer-events-none transition-opacity group-hover:opacity-40`} style={{ background: m.color }} />
            
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center transition-transform group-hover:scale-110" style={{ color: m.color }}>
                <m.icon size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-tertiary">{m.label}</span>
            </div>
            
            <div>
              <p className="text-2xl font-bold tracking-tight text-white mb-1">
                {m.value}
              </p>
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-tertiary" />
                <span className="text-[10px] font-mono text-tertiary">CURRENT SESSION</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Progress & Detailed Status */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          {/* Main Progress Card */}
          <div className="card border-blue-500/20 bg-blue-500/5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <Activity size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-none">Execution Velocity</h3>
                  <p className="text-xs text-secondary mt-1">Real-time pipeline progression</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-white">{completionPct}%</span>
                <p className="text-[10px] font-bold text-blue-400 mt-1 uppercase tracking-tighter">{statusLabel}</p>
              </div>
            </div>

            <div className="progress-bar-track h-3 bg-white/5 mb-6">
              <motion.div
                className="progress-bar-fill h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-400"
                initial={{ width: "0%" }}
                animate={{ width: `${completionPct}%` }}
                transition={{ duration: 1.2, ease: "circOut" }}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  {jobBadges.length > 0 ? (
                    jobBadges.map((job) => (
                      <div
                        key={job.id}
                        className="w-6 h-6 rounded-full border-2 border-primary bg-gray-700 shadow-sm shadow-black flex items-center justify-center text-[9px] font-black text-white"
                        title={job.name}
                      >
                        {(job.name.trim()[0] || "#").toUpperCase()}
                      </div>
                    ))
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-primary bg-gray-700 shadow-sm shadow-black" />
                  )}
                </div>
                <span className="text-xs font-semibold text-secondary">
                  {currentJobs.filter((j) => j.status === "completed").length} / {currentJobs.length} Jobs Finalized
                </span>
              </div>
              {currentRun && (
                <div className="flex items-center gap-2 text-tertiary">
                  <Clock size={12} />
                  <span className="text-[10px] font-bold font-mono tracking-tighter uppercase">{relativeTime(currentRun.created_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Jobs List - Deep Glass View */}
          {currentJobs.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-bold uppercase tracking-widest text-tertiary">Step-by-Step Breakdown</h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-secondary">FILTER</span>
                  <div className="w-px h-3 bg-white/10" />
                  <Zap size={12} className="text-yellow-400" />
                </div>
              </div>
              
              <div className="grid gap-3">
                {currentJobs.map((job) => {
                  const isSuccess = job.conclusion === "success";
                  const isFailure = job.conclusion === "failure";
                  const isRunning = job.status === "in_progress";
                  
                  return (
                    <motion.div
                      key={job.id}
                      whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.03)" }}
                      className="group flex items-center justify-between p-5 rounded-2xl border border-white/5 bg-white/[0.01] transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-blue-400 animate-pulse shadow-blue-400/50 shadow-sm' : isSuccess ? 'bg-green-500' : isFailure ? 'bg-red-500' : 'bg-gray-600'}`} />
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{job.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-bold font-mono text-tertiary tracking-tighter uppercase">ID: {job.id.toString().slice(-6)}</span>
                            <div className="w-1 h-1 rounded-full bg-tertiary/30" />
                            <span className="text-[10px] font-bold font-mono text-secondary tracking-tighter uppercase">{job.status}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        {job.durationSeconds != null && (
                          <div className="hidden sm:block text-right">
                            <p className="text-xs font-bold font-mono text-white leading-none">{fmtDuration(job.durationSeconds)}</p>
                            <p className="text-[9px] font-black text-tertiary mt-1 uppercase">EST. TIME</p>
                          </div>
                        )}
                        <div className="w-px h-8 bg-white/5" />
                        <a 
                          href={job.html_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-tertiary hover:text-white hover:bg-blue-500 transition-all shadow-xl"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {currentJobs.length === 0 && repoInsights?.commits && repoInsights.commits.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-bold uppercase tracking-widest text-tertiary">Latest Commit Activity</h3>
                <GitCommit size={12} className="text-blue-400" />
              </div>
              <div className="grid gap-3">
                {repoInsights.commits.slice(0, 6).map((commit) => (
                  <a
                    key={commit.sha}
                    href={commit.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-between p-5 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">{commit.message}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold font-mono text-blue-400 uppercase">{commit.sha.slice(0, 7)}</span>
                        <span className="text-[10px] font-bold text-secondary uppercase">{commit.author}</span>
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-tertiary uppercase font-mono whitespace-nowrap">
                      {relativeTime(commit.committedAt)}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info/Stats */}
        <div className="space-y-6">
          <div className="card border-purple-500/20 bg-purple-500/5">
            <h4 className="text-xs font-black text-purple-400 uppercase tracking-widest mb-4">Session Intelligence</h4>
            <div className="space-y-5">
              <div className="flex justify-between items-center group">
                <span className="text-xs text-secondary group-hover:text-white transition-colors">Success Rate</span>
                <span className="text-sm font-black font-mono text-white">{successRate}%</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${successRate}%` }}
                  className="h-full bg-purple-500 shadow-sm shadow-purple-500/50"
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
              {rateLimit && (
                <div className="pt-4 border-t border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-secondary font-medium">API Threshold</span>
                    <span className="text-xs font-bold text-white">{apiUsagePct}%</span>
                  </div>
                  <p className="text-[10px] text-tertiary leading-relaxed font-medium">
                    {rateLimit.remaining} of {rateLimit.limit} requests left. Reset in {resetCountdown(rateLimit.resetAt)}.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
