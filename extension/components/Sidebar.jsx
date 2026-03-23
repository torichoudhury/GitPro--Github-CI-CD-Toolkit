import React from 'react';
import { useApp } from '../popup/App';

const NAV_ITEMS = [
  { id: 'dashboard',   label: 'Dashboard',     icon: '⬡' },
  { id: 'workflow',    label: 'Workflow Vis',   icon: '◈' },
  { id: 'pipeline',    label: 'Pipeline Runs',  icon: '≡' },
  { id: 'diagnostics', label: 'Diagnostics',    icon: '◉' },
  { id: 'config',      label: 'Config Manager', icon: '⚙' },
];

export default function Sidebar() {
  const { activePage, setActivePage, data } = useApp();
  const activeNudges = data?.nudges?.filter((n) => !n.dismissed).length || 0;

  return (
    <aside className="w-[220px] h-full flex flex-col bg-gh-card border-r border-gh-border shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gh-border">
        <div className="inline-flex items-center gap-2">
          <span className="bg-gh-green/20 text-gh-green text-xs font-bold font-mono px-2.5 py-1 rounded-full border border-gh-green/30 tracking-widest">
            GitPro
          </span>
        </div>
        <p className="text-gh-muted text-[10px] mt-1.5 font-mono">CI/CD Toolkit</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={`nav-item w-full text-left ${activePage === item.id ? 'active' : ''}`}
          >
            <span className="text-base w-5 text-center leading-none">{item.icon}</span>
            <span className="text-sm">{item.label}</span>
            {item.id === 'diagnostics' && activeNudges > 0 && (
              <span className="ml-auto bg-gh-blue/20 text-gh-blue text-[10px] font-mono px-1.5 py-0.5 rounded-full">
                {activeNudges}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-gh-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gh-green/20 flex items-center justify-center text-gh-green text-xs">
            ◑
          </div>
          <div>
            <p className="text-gh-text text-xs font-medium leading-none">Demo Mode</p>
            <p className="text-gh-muted text-[10px] mt-0.5">octocat/gitpro-demo</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
