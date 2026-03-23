import React, { useState } from 'react';
import { useApp } from '../App';
import PipelineStage from '../../components/PipelineStage';
import LogDrawer from '../../components/LogDrawer';

export default function WorkflowVis() {
  const { data } = useApp();
  const [selectedStage, setSelectedStage] = useState(null);

  const stages = data?.pipeline?.stages || [];

  const statusSummary = {
    success:     stages.filter((s) => s.conclusion === 'success').length,
    in_progress: stages.filter((s) => s.status === 'in_progress').length,
    pending:     stages.filter((s) => s.status === 'pending').length,
    failure:     stages.filter((s) => s.conclusion === 'failure').length,
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gh-text font-semibold text-sm">Workflow Visualization</h2>
          <div className="flex gap-3 text-[10px] font-mono">
            {statusSummary.success > 0     && <span className="text-gh-green">✓ {statusSummary.success} passed</span>}
            {statusSummary.in_progress > 0 && <span className="text-gh-blue">◌ {statusSummary.in_progress} running</span>}
            {statusSummary.pending > 0     && <span className="text-gh-muted">○ {statusSummary.pending} pending</span>}
            {statusSummary.failure > 0     && <span className="text-red-400">✗ {statusSummary.failure} failed</span>}
          </div>
        </div>

        {/* Full-width pipeline */}
        <div className="flex items-center gap-0 py-4 justify-center">
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
      </div>

      {/* Stage detail cards */}
      <div className="grid grid-cols-2 gap-3">
        {stages.map((stage) => {
          const isActive = stage.status === 'in_progress';
          const isPassed = stage.conclusion === 'success';
          const isFailed = stage.conclusion === 'failure';
          const color = isActive ? '#58a6ff' : isPassed ? '#3fb950' : isFailed ? '#f85149' : '#8b949e';

          return (
            <button
              key={stage.id}
              onClick={() => setSelectedStage(stage)}
              className="card text-left hover:border-gh-blue/50 transition-all duration-200 hover:brightness-105 cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="font-semibold text-xs text-gh-text">{stage.name}</span>
                {stage.duration && (
                  <span className="ml-auto text-gh-muted font-mono text-[10px]">{stage.duration}</span>
                )}
              </div>
              <div className="text-gh-muted text-[10px] font-mono space-y-0.5">
                {stage.startedAt && (
                  <div>Started: {new Date(stage.startedAt).toLocaleTimeString()}</div>
                )}
                <div>
                  {stage.logs?.length > 0
                    ? stage.logs[stage.logs.length - 1].slice(0, 50)
                    : 'Click to view logs'}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedStage && (
        <LogDrawer stage={selectedStage} onClose={() => setSelectedStage(null)} />
      )}
    </div>
  );
}
