import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Info } from "lucide-react";
import { useCIPipeline } from "../contexts/CIPipelineContext";
import type { NudgeType } from "../types";

const NUDGE_ICONS: Record<NudgeType, string> = {
  push: "💾",
  pull: "⬇️",
  stale_branch: "🌿",
  ci_failure: "❌",
};

const NUDGE_BORDER: Record<NudgeType, string> = {
  push: "#58a6ff",
  pull: "#3fb950",
  stale_branch: "#d29922",
  ci_failure: "#f85149",
};

export const NudgeSystem: React.FC = () => {
  const { nudges, dismissNudge } = useCIPipeline();

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none px-4 pt-2 space-y-2">
      <AnimatePresence>
        {nudges.map((nudge) => (
          <motion.div
            key={nudge.id}
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg"
            style={{
              background: "#161b22",
              border: `1px solid ${NUDGE_BORDER[nudge.type]}`,
              boxShadow: `0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px ${NUDGE_BORDER[nudge.type]}20`,
            }}
          >
            <span className="text-lg leading-none mt-0.5">{NUDGE_ICONS[nudge.type]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "#e6edf3" }}>{nudge.title}</p>
              <p className="text-xs mt-0.5" style={{ color: "#8b949e" }}>{nudge.message}</p>
              <p className="text-xs mt-1 font-mono" style={{ color: "#6e7681" }}>{nudge.repo}</p>
            </div>
            <button
              onClick={() => dismissNudge(nudge.id)}
              className="text-gray-500 hover:text-white mt-0.5"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Inline nudge banners shown inside a panel (non-fixed)
export const InlineNudgeBanner: React.FC = () => {
  const { nudges, dismissNudge } = useCIPipeline();
  if (nudges.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {nudges.map((nudge) => (
        <motion.div
          key={nudge.id}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-start gap-3 px-3 py-2 rounded"
          style={{
            background: "#161b22",
            border: `1px solid ${NUDGE_BORDER[nudge.type]}`,
          }}
        >
          <span>{NUDGE_ICONS[nudge.type]}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{ color: "#e6edf3" }}>{nudge.title}</p>
            <p className="text-xs" style={{ color: "#8b949e" }}>{nudge.message}</p>
          </div>
          <button onClick={() => dismissNudge(nudge.id)} className="text-gray-500 hover:text-white">
            <X size={12} />
          </button>
        </motion.div>
      ))}
    </div>
  );
};
