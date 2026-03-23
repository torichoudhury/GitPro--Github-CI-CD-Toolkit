import React, { useState } from 'react';
import { useApp } from '../App';

function StatusBadge({ status, conclusion }) {
  if (status === 'in_progress') return <span className="badge badge-progress">In Progress</span>;
  if (conclusion === 'success')  return <span className="badge badge-success">Success</span>;
  if (conclusion === 'failure')  return <span className="badge badge-failure">Failed</span>;
  if (conclusion === 'skipped')  return <span className="badge badge-skipped">Skipped</span>;
  return <span className="badge badge-pending">{conclusion || status}</span>;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days  > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins  > 0) return `${mins}m ago`;
  return 'just now';
}

const PER_PAGE = 10;

export default function PipelineRuns() {
  const { data } = useApp();
  const [page, setPage] = useState(1);

  const allRuns = data?.recentRuns || [];
  const totalPages = Math.max(1, Math.ceil(allRuns.length / PER_PAGE));
  const runs = allRuns.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="space-y-3">
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gh-border">
          <h2 className="text-gh-text font-semibold text-sm">Pipeline Runs</h2>
          <p className="text-gh-muted text-xs mt-0.5 font-mono">{allRuns.length} total runs</p>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gh-border text-gh-muted">
              <th className="text-left px-4 py-2 font-mono font-medium">#</th>
              <th className="text-left px-3 py-2 font-mono font-medium">Branch</th>
              <th className="text-left px-3 py-2 font-mono font-medium">Trigger</th>
              <th className="text-left px-3 py-2 font-mono font-medium">Status</th>
              <th className="text-left px-3 py-2 font-mono font-medium">Duration</th>
              <th className="text-left px-3 py-2 font-mono font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run, i) => (
              <tr
                key={run.runNumber}
                className={`border-b border-gh-border/50 hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? '' : 'bg-gh-bg/30'}`}
              >
                <td className="px-4 py-2.5">
                  <span className="text-gh-blue font-mono font-semibold">
                    #{run.runNumber}
                  </span>
                </td>
                <td className="px-3 py-2.5 max-w-[100px]">
                  <span className="text-gh-text font-mono truncate block" title={run.branch}>
                    {run.branch}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-gh-muted font-mono">{run.trigger}</span>
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={run.status} conclusion={run.conclusion} />
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-gh-muted font-mono">{run.duration || '—'}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-gh-muted font-mono">{timeAgo(run.startedAt)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gh-border">
          <span className="text-gh-muted text-xs font-mono">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary py-1 px-2.5 disabled:opacity-30"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary py-1 px-2.5 disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
