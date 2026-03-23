import React, { useState } from 'react';
import { useApp } from '../App';
import PipelineStage from '../../components/PipelineStage';
import MetricCard from '../../components/MetricCard';
import LogDrawer from '../../components/LogDrawer';

export default function Dashboard() {
  const { data } = useApp();
  const [selectedStage, setSelectedStage] = useState(null);

  const stages  = data?.pipeline?.stages  || [];
  const monitor = data?.monitor || {};
  const progress = monitor.progress || 0;

  return (
    <div className="space-y-4">
      {/* Card 1 — Workflow Visualization */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gh-text font-semibold text-sm">Workflow Visualization</h2>
          <span className="text-gh-muted text-xs font-mono">{monitor.workflowName}</span>
        </div>

        {/* Pipeline stages */}
        <div className="flex items-center gap-0 overflow-x-auto pb-1">
          {stages.map((stage, i) => (
            <PipelineStage
              key={stage.id}
              stage={stage}
              index={i}
              isLast={i === stages.length - 1}
              onClick={setSelectedStage}
            />
          ))}
        </div>

        <p className="text-gh-muted text-[10px] mt-3 font-mono">
          Click any stage to view logs
        </p>
      </div>

      {/* Card 2 — Real-time Monitor */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gh-text font-semibold text-sm">Real-time Monitor</h2>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gh-green animate-pulse" />
            <span className="text-gh-muted text-[10px] font-mono">Live · 15s refresh</span>
          </div>
        </div>

        {/* 2×2 metric grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <MetricCard label="Run ID"       value={monitor.runId || '—'}       accent="blue"  />
          <MetricCard label="Trigger"      value={monitor.trigger || '—'}     accent="muted" />
          <MetricCard label="Duration"     value={monitor.duration || '—'}    accent="muted" />
          <MetricCard label="Success Rate" value={monitor.successRate || '—'} accent="green" />
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-gh-muted text-xs font-mono">{monitor.progressLabel}</span>
            <span className="text-gh-blue text-xs font-mono font-semibold">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gh-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #58a6ff, #3fb950)',
                boxShadow: '0 0 8px #58a6ff60',
              }}
            />
          </div>
        </div>
      </div>

      {/* Log drawer */}
      {selectedStage && (
        <LogDrawer stage={selectedStage} onClose={() => setSelectedStage(null)} />
      )}
    </div>
  );
}
