import React from 'react';

export default function MetricCard({ label, value, sub, accent }) {
  const accentColors = {
    green:  { text: '#3fb950', bg: '#3fb95010' },
    blue:   { text: '#58a6ff', bg: '#58a6ff10' },
    red:    { text: '#f85149', bg: '#f8514910' },
    yellow: { text: '#d29922', bg: '#d2992210' },
    muted:  { text: '#8b949e', bg: '#8b949e08' },
  };
  const colors = accentColors[accent] || accentColors.muted;

  return (
    <div
      className="flex flex-col gap-1.5 p-3 rounded-lg border border-gh-border"
      style={{ background: colors.bg }}
    >
      <span className="metric-label">{label}</span>
      <span
        className="font-mono font-semibold text-base leading-tight"
        style={{ color: colors.text }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-gh-muted text-[10px] font-mono leading-none">{sub}</span>
      )}
    </div>
  );
}
