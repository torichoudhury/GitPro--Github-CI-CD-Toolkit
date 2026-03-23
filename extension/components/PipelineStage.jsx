import React, { useState } from 'react';

const STATUS_CONFIG = {
  success:     { dot: '#3fb950', border: '#3fb950', bg: '#3fb95015', label: 'Passed',     icon: '✓' },
  in_progress: { dot: '#58a6ff', border: '#58a6ff', bg: '#58a6ff15', label: 'Running…',   icon: '◌' },
  pending:     { dot: '#8b949e', border: '#30363d', bg: '#8b949e08', label: 'Pending',     icon: '○' },
  failure:     { dot: '#f85149', border: '#f85149', bg: '#f8514915', label: 'Failed',      icon: '✗' },
  queued:      { dot: '#8b949e', border: '#30363d', bg: '#8b949e08', label: 'Queued',      icon: '◷' },
};

function getConfig(stage) {
  if (stage.status === 'completed') {
    return STATUS_CONFIG[stage.conclusion] || STATUS_CONFIG.pending;
  }
  return STATUS_CONFIG[stage.status] || STATUS_CONFIG.pending;
}

export default function PipelineStage({ stage, index, onClick, isLast }) {
  const cfg = getConfig(stage);
  const isActive = stage.status === 'in_progress';

  return (
    <div className="flex items-center">
      {/* Stage box */}
      <button
        onClick={() => onClick(stage)}
        className={`stage-${index} relative flex flex-col items-center gap-1 px-4 py-2.5 rounded-lg border transition-all duration-200 cursor-pointer hover:brightness-110 active:scale-95 min-w-[90px]`}
        style={{
          borderColor: cfg.border,
          background:  cfg.bg,
        }}
        title={`${stage.name} — click for logs`}
      >
        {/* Status dot */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'animate-pulse' : ''}`}
            style={{ background: cfg.dot, boxShadow: isActive ? `0 0 8px ${cfg.dot}` : 'none' }}
          />
          <span
            className="text-xs font-semibold font-mono"
            style={{ color: cfg.dot }}
          >
            {stage.name}
          </span>
        </div>

        {/* Status label */}
        <span className="text-[10px] font-mono" style={{ color: cfg.dot + 'cc' }}>
          {cfg.label}
          {stage.duration ? ` · ${stage.duration}` : ''}
        </span>

        {/* Active ring */}
        {isActive && (
          <span
            className="absolute -inset-0.5 rounded-lg border animate-pulse pointer-events-none"
            style={{ borderColor: cfg.border + '60' }}
          />
        )}
      </button>

      {/* Arrow connector */}
      {!isLast && (
        <div
          className={`flex-shrink-0 mx-1.5 h-px w-8 ${isActive ? 'arrow-pulse' : ''}`}
          style={{ background: `linear-gradient(90deg, ${cfg.border}80, ${cfg.border}20)` }}
        >
          <div
            className="absolute text-[8px] -translate-y-1.5 ml-6"
            style={{ color: cfg.border + '80' }}
          >▶</div>
        </div>
      )}
    </div>
  );
}
