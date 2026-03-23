import React from 'react';
import { useApp } from '../App';

function RiskBadge({ level }) {
  const cfg = {
    green:  { label: 'Low Risk',    color: '#3fb950', bg: '#3fb95018' },
    yellow: { label: 'Medium Risk', color: '#d29922', bg: '#d2992218' },
    red:    { label: 'High Risk',   color: '#f85149', bg: '#f8514918' },
  };
  const c = cfg[level] || cfg.green;
  return (
    <span
      className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.color}30` }}
    >
      {c.label}
    </span>
  );
}

function timeAgoHours(dateStr) {
  if (!dateStr) return '—';
  const diff  = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  return hours > 0 ? `${hours}h ago` : 'recently';
}

export default function Diagnostics() {
  const { data } = useApp();
  const diag = data?.diagnostics;

  if (!diag) return (
    <div className="flex items-center justify-center h-40 text-gh-muted text-sm">
      No diagnostics data available.
    </div>
  );

  const lastPushHours = diag.lastPushedAt
    ? (Date.now() - new Date(diag.lastPushedAt).getTime()) / 3600000
    : 0;

  return (
    <div className="space-y-3">
      {/* Branch Divergence */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-gh-text font-semibold text-sm">Branch Divergence</h2>
          <RiskBadge level={diag.riskLevel} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 rounded-md bg-gh-bg border border-gh-border">
            <div className="text-gh-green font-mono font-bold text-2xl">{diag.commitsAhead}</div>
            <div className="text-gh-muted text-[10px] mt-1">commits ahead</div>
          </div>
          <div className="text-center p-3 rounded-md bg-gh-bg border border-gh-border">
            <div
              className="font-mono font-bold text-2xl"
              style={{ color: diag.riskLevel === 'red' ? '#f85149' : diag.riskLevel === 'yellow' ? '#d29922' : '#8b949e' }}
            >
              {diag.commitsBehind}
            </div>
            <div className="text-gh-muted text-[10px] mt-1">commits behind</div>
          </div>
        </div>
      </div>

      {/* Nudge Banners */}
      {lastPushHours > 2 && diag.commitsAhead > 0 && (
        <div className="p-3 rounded-md border border-yellow-600/30 bg-yellow-500/10 text-yellow-300 text-xs flex items-center gap-2">
          <span>⬆</span>
          No push in {Math.floor(lastPushHours)}h — push your local commits!
        </div>
      )}
      {diag.commitsBehind > 0 && (
        <div className="p-3 rounded-md border border-gh-blue/30 bg-gh-blue/10 text-gh-blue text-xs flex items-center gap-2">
          <span>⬇</span>
          Your branch is {diag.commitsBehind} commit(s) behind. Pull latest!
        </div>
      )}

      {/* Conflict Risk */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-gh-text font-semibold text-sm">Conflict Risk</h2>
          <span
            className="font-mono font-bold text-sm"
            style={{ color: diag.conflictRiskScore > 50 ? '#f85149' : diag.conflictRiskScore > 20 ? '#d29922' : '#3fb950' }}
          >
            {diag.conflictRiskScore}%
          </span>
        </div>
        {diag.conflictFiles && diag.conflictFiles.length > 0 ? (
          <div className="space-y-1.5">
            {diag.conflictFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-red-400 font-mono shrink-0">⚠</span>
                <span className="text-gh-text font-mono flex-1 truncate" title={f.file}>{f.file}</span>
                <span className="text-gh-muted font-mono shrink-0">{f.editCount} edits</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gh-muted text-xs">No high-risk files detected.</p>
        )}
      </div>

      {/* Stale Branches */}
      {diag.staleBranches && diag.staleBranches.length > 0 && (
        <div className="card">
          <h2 className="text-gh-text font-semibold text-sm mb-3">Stale Branches</h2>
          <div className="space-y-2">
            {diag.staleBranches.map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-gh-muted">🌿</span>
                <span className="text-gh-text font-mono flex-1">{b.name}</span>
                <span className="text-gh-muted font-mono">
                  Last: {timeAgoHours(b.lastCommitAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-gh-muted text-[10px] font-mono text-center">
        Diagnostics snapshot at {new Date().toLocaleTimeString()}
      </p>
    </div>
  );
}
