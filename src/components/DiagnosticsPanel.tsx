import React from "react";
import { motion } from "framer-motion";
import {
  GitMerge,
  AlertTriangle,
  Leaf,
  RefreshCw,
  Loader2,
  Info,
  ChevronRight,
  GitBranch,
  Activity,
  Zap,
} from "lucide-react";
import { useCIPipeline } from "../contexts/CIPipelineContext";

function riskColor(score: number) {
  if (score < 0.33) return "#4ade80";
  if (score < 0.67) return "#fbbf24";
  return "#f87171";
}

function divergenceColor(behind: number) {
  if (behind <= 2) return { color: "#4ade80", label: "LOW RISK" };
  if (behind <= 10) return { color: "#fbbf24", label: "MEDIUM RISK" };
  return { color: "#f87171", label: "CRITICAL RISK" };
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

  if (!activeRepo) return null;

  const div = diagnostics?.divergence;
  const divInfo = div ? divergenceColor(div.behind) : null;

  return (
    <div className="h-full flex flex-col gap-8 fade-in">
      {/* Header Section */}
      <div className="flex items-end justify-between px-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">System Diagnostics</h2>
          <div className="flex items-center gap-2 group cursor-default">
            <Activity size={14} className="text-purple-400" />
            <p className="text-sm font-medium text-secondary group-hover:text-white transition-colors">
              Health & Integrity Check for {activeRepo.fullName}
              {diagnostics?.refreshedAt && (
                <span className="opacity-50 ml-1 font-mono uppercase text-[10px]">· refreshed {relDays(diagnostics.refreshedAt)}</span>
              )}
            </p>
          </div>
        </div>
        
        <button
          onClick={refreshDiagnostics}
          disabled={isLoadingDiagnostics}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-secondary hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
        >
          {isLoadingDiagnostics ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
          Deep Scan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Branch Divergence - Premium Visualization */}
        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           className="card border-blue-500/10 bg-blue-500/5 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[60px] opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity" />
          
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <GitMerge size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg leading-none">Branch Integrity</h3>
              <p className="text-[10px] text-blue-400/60 font-black uppercase tracking-widest mt-1">Divergence Analysis</p>
            </div>
            {divInfo && (
              <div className="ml-auto px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border" style={{ background: `${divInfo.color}10`, color: divInfo.color, borderColor: `${divInfo.color}20` }}>
                {divInfo.label}
              </div>
            )}
          </div>

          {div ? (
            <div className="space-y-6">
              <div className="flex items-center gap-10">
                 <div className="flex-1 p-6 rounded-3xl bg-black/30 border border-white/5 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-10 h-10 bg-green-500/5 blur-xl" />
                    <span className="text-3xl font-black text-white italic block">{div.ahead}</span>
                    <span className="text-[10px] font-black text-tertiary uppercase tracking-widest mt-1 block">AHEAD ORIGIN</span>
                 </div>
                 <div className="text-tertiary">
                    <ChevronRight size={24} className="opacity-20" />
                 </div>
                 <div className="flex-1 p-6 rounded-3xl bg-black/30 border border-white/5 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-10 h-10 bg-red-500/5 blur-xl" />
                    <span className="text-3xl font-black text-white italic block" style={{ color: divInfo?.color }}>{div.behind}</span>
                    <span className="text-[10px] font-black text-tertiary uppercase tracking-widest mt-1 block">BEHIND ORIGIN</span>
                 </div>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 mx-1">
                 <div className="flex items-center gap-2">
                    <GitBranch size={12} className="text-tertiary" />
                    <span className="text-xs font-bold text-secondary uppercase tracking-tight">{div.currentBranch}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-tertiary uppercase tracking-tight">vs</span>
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-tight font-mono">{div.baseBranch}</span>
                 </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center bg-black/20 rounded-3xl border border-white/5 border-dashed">
                <p className="text-xs font-bold text-tertiary uppercase tracking-widest italic">{isLoadingDiagnostics ? "Engaging scan..." : "No data discovered"}</p>
            </div>
          )}
        </motion.div>

        {/* Conflict Exposure Map */}
        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.1 }}
           className="card border-orange-500/10 bg-orange-500/5 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[60px] opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity" />
          
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg leading-none">Conflict Exposure</h3>
              <p className="text-[10px] text-orange-400/60 font-black uppercase tracking-widest mt-1">Multi-User Overlap Risk</p>
            </div>
            <div className="ml-auto flex items-center gap-1 cursor-help" title="Risk identified via parallel commit frequency">
              <Info size={14} className="text-tertiary hover:text-white transition-colors" />
            </div>
          </div>

          <div className="space-y-4 max-h-[300px] overflow-y-auto px-1 custom-scrollbar">
            {diagnostics?.conflictFiles && diagnostics.conflictFiles.length > 0 ? (
              diagnostics.conflictFiles.map((f, i) => (
                <motion.div 
                  key={f.filename}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + (i * 0.05) }}
                  className="p-4 rounded-2xl bg-black/40 border border-white/5 group/file"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-white group-hover/file:text-orange-400 transition-colors uppercase tracking-tight">{f.filename.split('/').pop()}</span>
                    <span className="text-[10px] font-black font-mono tracking-tighter transition-colors" style={{ color: riskColor(f.riskScore) }}>
                      {(f.riskScore * 100).toFixed(0)}% THREAT
                    </span>
                  </div>
                  <div className="progress-bar-track h-1 bg-white/5 mb-3">
                    <motion.div
                      className="progress-bar-fill h-full"
                      initial={{ width: "0%" }}
                      animate={{ width: `${f.riskScore * 100}%` }}
                      style={{ background: `linear-gradient(90deg, #30363d, ${riskColor(f.riskScore)})` }}
                    />
                  </div>
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {f.recentEditors.slice(0, 4).map(e => (
                       <div key={e.login} className="w-5 h-5 rounded-full bg-gray-700 border border-black flex items-center justify-center text-[8px] font-black text-white hover:z-10 transition-transform hover:scale-125 cursor-default group" title={e.login}>
                          {e.login.slice(0, 1).toUpperCase()}
                       </div>
                    ))}
                    {f.recentEditors.length > 4 && <span className="text-[8px] text-tertiary ml-2 self-center">+{f.recentEditors.length - 4} MORE</span>}
                  </div>
                </motion.div>
              ))
            ) : (
                <div className="py-24 text-center">
                    <span className="text-[10px] font-black text-tertiary uppercase tracking-widest italic opacity-20">NO COLLISION THREAT DETECTED</span>
                </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Stale Resources Analysis */}
      <motion.div
         initial={{ opacity: 0, y: 30 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.2 }}
         className="card border-green-500/10 bg-green-500/5 relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 blur-[100px] opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity" />
        
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400">
                <Leaf size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg leading-none">Resource Hygiene</h3>
                <p className="text-[10px] text-green-400/60 font-black uppercase tracking-widest mt-1">Stale Branch Monitoring</p>
              </div>
           </div>
           {diagnostics?.staleBranches && diagnostics.staleBranches.length > 0 && (
             <div className="px-4 py-2 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-black uppercase tracking-tighter">
                {diagnostics.staleBranches.length} FRAGMENTS DETECTED
             </div>
           )}
        </div>

        {diagnostics?.staleBranches && diagnostics.staleBranches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {diagnostics.staleBranches.map((b) => (
              <div
                key={b.name}
                className="p-5 rounded-3xl bg-black/40 border border-white/5 hover:border-green-500/20 transition-all group/branch relative"
              >
                <div className="flex items-start justify-between mb-4">
                   <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-white font-mono group-hover/branch:text-green-400 transition-colors">{b.name.length > 20 ? b.name.slice(0, 17) + '...' : b.name}</span>
                        <Zap size={10} className="text-yellow-400 opacity-40" />
                      </div>
                      <p className="text-[10px] font-bold text-tertiary uppercase tracking-tighter leading-relaxed">
                        Last Activity by <span className="text-secondary">{b.author}</span>
                      </p>
                   </div>
                   <div className="flex flex-col items-end">
                      <span className="text-[16px] font-black text-white leading-none tracking-tighter">{b.daysInactive}D</span>
                      <span className="text-[8px] font-black text-tertiary uppercase tracking-tighter mt-1">INACTIVE</span>
                   </div>
                </div>
                
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                   <button className="text-[9px] font-black text-tertiary uppercase tracking-widest hover:text-white transition-colors">DEPRECATE BRANCH</button>
                   <ChevronRight size={14} className="text-tertiary/20 group-hover/branch:translate-x-1 group-hover/branch:text-green-400 transition-all" />
                </div>
              </div>
            ))}
          </div>
        ) : (
            <div className="py-20 text-center bg-black/10 rounded-3xl border border-white/5 border-dashed opacity-40">
                <span className="text-[10px] font-black text-tertiary uppercase tracking-widest italic">OPTIMAL RESOURCE HYGIENE MAINTAINED</span>
            </div>
        )}
      </motion.div>
    </div>
  );
};
