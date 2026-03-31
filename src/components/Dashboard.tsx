import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitBranch,
  Activity,
  History,
  Stethoscope,
  FileText,
  Settings as SettingsIcon,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Cpu,
  RefreshCw,
  Workflow,
  GitCommit,
  AlertTriangle,
} from "lucide-react";
import { WorkflowVisualization } from "./WorkflowVisualization";
import { PipelineMonitor } from "./PipelineMonitor";
import { PipelineHistory } from "./PipelineHistory";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { LogTranslator } from "./LogTranslator";
import { SettingsPanel } from "./SettingsPanel";
import { NudgeSystem } from "./NudgeSystem";
import { useCIPipeline } from "../contexts/CIPipelineContext";
import { useAuth } from "../contexts/AuthContext";

type PanelType =
  | "pipeline"
  | "monitor"
  | "history"
  | "diagnostics"
  | "logs"
  | "settings";

const NAV_ITEMS = [
  { id: "pipeline", icon: GitBranch, label: "Pipeline" },
  { id: "monitor", icon: Activity, label: "Monitor" },
  { id: "history", icon: History, label: "History" },
  { id: "diagnostics", icon: Stethoscope, label: "Diagnostics" },
  { id: "logs", icon: FileText, label: "Logs" },
];

export const Dashboard: React.FC = () => {
  const [activePanel, setActivePanel] = useState<PanelType>("pipeline");
  const {
    rateLimit,
    activeRepo,
    repoInsights,
    isLoadingRepoInsights,
    repoInsightsError,
    refreshRuns,
    refreshDiagnostics,
    refreshRepoInsights,
  } = useCIPipeline();
  const { userProfile } = useAuth();
  const [isPopup, setIsPopup] = useState(window.innerWidth < 1000);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsPopup(window.innerWidth < 1000);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleRefreshAll = async () => {
    setIsRefreshingAll(true);
    try {
      await Promise.all([
        refreshRuns(),
        refreshDiagnostics(),
        refreshRepoInsights(),
      ]);
    } finally {
      setIsRefreshingAll(false);
    }
  };

  const currentNavItem = [...NAV_ITEMS, { id: "settings", icon: SettingsIcon, label: "Settings" }].find(n => n.id === activePanel);

  return (
    <div className="flex h-full w-full overflow-hidden text-primary relative font-sans">
      {/* Dynamic Background Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none z-0" />

      {/* Sidebar - Premium Glass */}
      <motion.nav
        initial={false}
        animate={{ width: isPopup ? 200 : 290 }}
        className="glass-panel flex flex-col z-30 border-r border-white/5 relative"
      >
        <div className={`${isPopup ? "h-16 px-4" : "h-20 px-6"} flex items-center border-b border-white/5`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 flex-shrink-0">
            GP
          </div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={isPopup ? "ml-3" : "ml-4"}
          >
            <h1 className={`${isPopup ? "text-sm" : "text-xl"} font-bold tracking-tight text-gradient leading-none`}>GitPro</h1>
            <p className={`${isPopup ? "text-[9px]" : "text-[10px]"} text-tertiary mt-1 font-mono uppercase tracking-widest`}>v2.0.4 Premium</p>
          </motion.div>
        </div>

        <div className={`flex-1 ${isPopup ? "py-5 px-3 space-y-2" : "py-10 px-4 space-y-3"}`}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePanel === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePanel(item.id as PanelType)}
                className={`w-full flex items-center ${isPopup ? "gap-3 px-3 py-2.5" : "gap-4 px-4 py-3.5"} rounded-2xl transition-all duration-300 group relative ${
                  isActive
                    ? "bg-white/10 text-white shadow-lg shadow-black/20"
                    : "text-secondary hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className={`transition-transform duration-300 flex-shrink-0 ${isActive ? "scale-110 text-blue-400" : "group-hover:scale-110"}`}>
                  <Icon size={22} />
                </div>
                <span className={`${isPopup ? "text-xs" : "text-sm"} font-semibold transition-all ${isActive ? "translate-x-1" : ""}`}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-500 rounded-r-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className={`${isPopup ? "p-3" : "p-4"} border-t border-white/5 space-y-2`}>
          <button
            onClick={() => setActivePanel("settings")}
            className={`w-full flex items-center ${isPopup ? "gap-3 px-3 py-2.5" : "gap-4 px-4 py-3.5"} rounded-2xl transition-all duration-300 group ${
              activePanel === 'settings' ? "bg-white/10 text-white shadow-lg" : "text-secondary hover:bg-white/5 hover:text-white"
            }`}
          >
            <SettingsIcon size={22} className="flex-shrink-0" />
            <span className={`${isPopup ? "text-xs" : "text-sm"} font-semibold`}>Settings</span>
          </button>
        </div>
      </motion.nav>

      {/* Content Area */}
      <main className="flex-1 min-h-0 flex flex-col relative z-10 overflow-hidden bg-transparent">
        {/* Nudge System - Global */}
        <NudgeSystem />

        {/* Header - Floating Glass Card */}
        <header className={`${isPopup ? "h-16 px-4" : "h-20 px-6"} flex items-center justify-between border-b border-white/5`}>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-secondary/50 font-light text-sm uppercase tracking-widest font-mono">Overview</span>
              <ChevronRight size={14} className="text-tertiary" />
              <h2 className="text-xl font-bold tracking-tight text-gradient">
                {currentNavItem?.label}
              </h2>
            </div>
            
            {activeRepo && (
              <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 ring-1 ring-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[11px] font-mono font-medium text-blue-400/80 tracking-tight">
                  {activeRepo.fullName}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-5">
            {/* API Health */}
            {rateLimit && !isPopup && (
              <div className={`hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-xl border ${rateLimit.remaining < 50 ? 'border-red-500/20 bg-red-500/5 text-red-400' : 'border-white/10 bg-white/5 text-tertiary'}`}>
                <Cpu size={14} />
                <span className="text-[10px] font-bold font-mono tracking-tighter uppercase">
                  API: {rateLimit.remaining} / {rateLimit.limit}
                </span>
              </div>
            )}

            <button
              onClick={() => {
                void handleRefreshAll();
              }}
              disabled={isRefreshingAll}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-secondary hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
              title="Refresh workflows, diagnostics, and repository insights"
            >
              <RefreshCw size={14} className={isRefreshingAll ? "spin" : ""} />
              Refresh All
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.open(window.location.href, "_blank")}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-secondary hover:text-white transition-all group"
                title="Open in new tab"
              >
                <ExternalLink size={18} className="transition-transform group-hover:scale-110" />
              </button>

              {userProfile ? (
                <div className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-2xl bg-white/5 border border-white/10 shadow-lg max-w-[280px]">
                  {userProfile.photoURL ? (
                    <img
                      src={userProfile.photoURL}
                      alt={userProfile.githubUsername || "GitHub profile"}
                      className="w-10 h-10 rounded-xl object-cover border border-white/10"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-gray-800 to-gray-700 border border-white/10 flex items-center justify-center">
                      <ShieldCheck size={20} className="text-blue-400/50" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-white truncate font-semibold">
                      {userProfile.displayName || userProfile.githubUsername}
                    </p>
                    <p className="text-[10px] text-blue-400/80 font-mono truncate">
                      @{userProfile.githubUsername}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-gray-800 to-gray-700 border border-white/10 flex items-center justify-center shadow-lg">
                  <ShieldCheck size={20} className="text-blue-400/50" />
                </div>
              )}
            </div>
          </div>
        </header>

        {activeRepo && (
          <div className="px-4 sm:px-6 py-3 border-b border-white/5 bg-black/10">
            {repoInsightsError ? (
              <div className="flex items-center gap-2 text-xs font-medium text-red-300">
                <AlertTriangle size={14} className="text-red-400" />
                {repoInsightsError}
              </div>
            ) : isLoadingRepoInsights && !repoInsights ? (
              <div className="flex items-center gap-2 text-xs font-medium text-tertiary">
                <RefreshCw size={14} className="spin" />
                Loading repository insights...
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-blue-300">
                  <GitBranch size={12} />
                  {repoInsights?.defaultBranch ?? activeRepo.defaultBranch}
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-tertiary">
                  <Workflow size={12} />
                  {repoInsights?.workflows.length ?? 0} workflows
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-tertiary">
                  <GitCommit size={12} />
                  {repoInsights?.commits.length ?? 0} recent commits
                </div>
                {repoInsights?.pushedAt && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-tertiary">
                    <Activity size={12} />
                    pushed {new Date(repoInsights.pushedAt).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Viewport */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePanel}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02, y: -10 }}
              transition={{ 
                type: "spring", 
                stiffness: 260, 
                damping: 25,
                duration: 0.3 
              }}
              className="min-h-full"
            >
              <div className={`container ${isPopup ? "py-3 px-3" : "py-12 px-10"} max-w-7xl mx-auto`}>
                {activePanel === "pipeline" && <WorkflowVisualization />}
                {activePanel === "monitor" && <PipelineMonitor />}
                {activePanel === "history" && <PipelineHistory />}
                {activePanel === "diagnostics" && <DiagnosticsPanel />}
                {activePanel === "logs" && <LogTranslator />}
                {activePanel === "settings" && <SettingsPanel />}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
