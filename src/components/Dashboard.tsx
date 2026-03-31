import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitBranch,
  Activity,
  History,
  Stethoscope,
  FileText,
  Settings,
} from "lucide-react";
import { WorkflowVisualization } from "./WorkflowVisualization";
import { PipelineMonitor } from "./PipelineMonitor";
import { PipelineHistory } from "./PipelineHistory";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { LogTranslator } from "./LogTranslator";
import { SettingsPanel } from "./SettingsPanel";
import { NudgeSystem } from "./NudgeSystem";
import { useCIPipeline } from "../contexts/CIPipelineContext";

type PanelType =
  | "pipeline"
  | "monitor"
  | "history"
  | "diagnostics"
  | "logs"
  | "settings";

const NAV_ITEMS = [
  {
    id: "pipeline" as PanelType,
    icon: GitBranch,
    label: "Pipeline",
    color: "#58a6ff",
  },
  {
    id: "monitor" as PanelType,
    icon: Activity,
    label: "Monitor",
    color: "#3fb950",
  },
  {
    id: "history" as PanelType,
    icon: History,
    label: "History",
    color: "#d29922",
  },
  {
    id: "diagnostics" as PanelType,
    icon: Stethoscope,
    label: "Diagnostics",
    color: "#f85149",
  },
  {
    id: "logs" as PanelType,
    icon: FileText,
    label: "Log Translator",
    color: "#8b949e",
  },
  {
    id: "settings" as PanelType,
    icon: Settings,
    label: "Settings",
    color: "#6e7681",
  },
];

export const Dashboard: React.FC = () => {
  const [activePanel, setActivePanel] = useState<PanelType>("pipeline");
  const { rateLimit, nudges, activeRepo, config } = useCIPipeline();

  const lowQuota = rateLimit && rateLimit.remaining < 100;

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: "#0d1117", color: "#e6edf3" }}
    >
      {/* Nudge system floats above everything */}
      <NudgeSystem />

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid #21262d", background: "#161b22" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: "#3fb950" }}
          >
            <span className="font-mono font-bold text-xs" style={{ color: "#0d1117" }}>
              GP
            </span>
          </div>
          <span className="font-semibold text-sm" style={{ color: "#e6edf3" }}>
            GitPro
          </span>
          {activeRepo && (
            <span
              className="font-mono text-xs px-2 py-0.5 rounded"
              style={{
                background: "#21262d",
                color: "#3fb950",
                border: "1px solid #30363d",
              }}
            >
              {activeRepo.fullName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {nudges.length > 0 && (
            <span
              className="font-mono text-xs px-1.5 py-0.5 rounded"
              style={{ background: "#f8514920", color: "#f85149", border: "1px solid #f8514930" }}
            >
              {nudges.length} nudge{nudges.length > 1 ? "s" : ""}
            </span>
          )}
          {lowQuota && (
            <span
              className="font-mono text-xs px-2 py-0.5 rounded"
              style={{ background: "#d2992220", color: "#d29922", border: "1px solid #d2992230" }}
            >
              ⚠ API: {rateLimit!.remaining} left
            </span>
          )}
          {!config.githubToken && (
            <span
              className="font-mono text-xs px-2 py-0.5 rounded cursor-pointer"
              style={{ background: "#f8514920", color: "#f85149", border: "1px solid #f8514930" }}
              onClick={() => setActivePanel("settings")}
            >
              No token — add in Settings
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <motion.nav
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col gap-1 p-3 flex-shrink-0"
          style={{
            width: 180,
            background: "#161b22",
            borderRight: "1px solid #21262d",
          }}
        >
          {NAV_ITEMS.map((item) => {
            const active = activePanel === item.id;
            return (
              <motion.button
                key={item.id}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActivePanel(item.id)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-left text-sm transition-colors"
                style={{
                  background: active ? `${item.color}18` : "transparent",
                  color: active ? item.color : "#8b949e",
                  border: active
                    ? `1px solid ${item.color}30`
                    : "1px solid transparent",
                  fontWeight: active ? 500 : 400,
                }}
              >
                <item.icon size={15} />
                {item.label}
              </motion.button>
            );
          })}
        </motion.nav>

        {/* Main content */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePanel}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activePanel === "pipeline" && <WorkflowVisualization />}
              {activePanel === "monitor" && <PipelineMonitor />}
              {activePanel === "history" && <PipelineHistory />}
              {activePanel === "diagnostics" && <DiagnosticsPanel />}
              {activePanel === "logs" && <LogTranslator />}
              {activePanel === "settings" && <SettingsPanel />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
