import React from 'react';

const NUDGE_CONFIG = {
  pull_nudge:   { color: '#58a6ff', bg: '#58a6ff12', border: '#58a6ff30', icon: '⬇' },
  push_nudge:   { color: '#d29922', bg: '#d2992212', border: '#d2992230', icon: '⬆' },
  stale_branch: { color: '#8b949e', bg: '#8b949e12', border: '#8b949e30', icon: '🌿' },
  ci_failure:   { color: '#f85149', bg: '#f8514912', border: '#f8514930', icon: '✗' },
};

export default function NudgeBanner({ nudge, onDismiss }) {
  const cfg = NUDGE_CONFIG[nudge.nudgeType] || NUDGE_CONFIG.pull_nudge;

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs animate-fade-in"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <span style={{ color: cfg.color }} className="shrink-0 text-sm">{cfg.icon}</span>
      <span className="flex-1 text-gh-text">{nudge.message}</span>
      <button
        onClick={() => onDismiss(nudge.id)}
        className="shrink-0 text-gh-muted hover:text-gh-text transition-colors ml-1"
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
