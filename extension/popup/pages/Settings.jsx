import React from 'react';
import { useApp } from '../App';

export default function Settings() {
  const { fetchDashboard } = useApp();

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-gh-text font-semibold text-sm mb-3">Settings</h2>
        <p className="text-gh-muted text-xs mb-4">
          Extension settings and preferences are managed via the <strong>Config Manager</strong> tab.
        </p>
        <div className="space-y-2 text-xs text-gh-muted font-mono">
          <div className="flex justify-between py-1.5 border-b border-gh-border/40">
            <span>Version</span><span className="text-gh-text">1.0.0</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-gh-border/40">
            <span>Mode</span><span className="text-gh-green">Demo</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-gh-border/40">
            <span>API</span><span className="text-gh-blue">localhost:3000</span>
          </div>
        </div>
        <button onClick={fetchDashboard} className="btn-primary mt-4 w-full">
          Force Refresh
        </button>
      </div>
    </div>
  );
}
