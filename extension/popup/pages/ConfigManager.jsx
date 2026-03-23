import React, { useState } from 'react';
import { useApp } from '../App';

function Toggle({ checked, onChange }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only toggle-input"
      />
      <div
        className="w-9 h-5 rounded-full transition-colors duration-200 relative toggle-track"
        style={{ background: checked ? '#3fb950' : '#30363d' }}
      >
        <div
          className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 toggle-thumb"
          style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
        />
      </div>
    </label>
  );
}

const INTERVAL_OPTIONS = [
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
  { label: '1 min', value: 60 },
  { label: '5 min', value: 300 },
];

export default function ConfigManager() {
  const { data } = useApp();

  const [token, setToken]   = useState('');
  const [saved, setSaved]   = useState(false);
  const [tokenError, setTokenError] = useState('');

  const [repos, setRepos]   = useState(data?.repos || []);
  const [newRepo, setNewRepo] = useState('');

  const [prefs, setPrefs]   = useState({
    pushNudges:   true,
    pullNudges:   true,
    ciFailures:   true,
    staleBranches: false,
  });

  const [interval, setInterval_] = useState(30);

  const handleSaveToken = () => {
    if (!token.trim()) { setTokenError('Token cannot be empty'); return; }
    if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
      setTokenError('Token should start with ghp_ or github_pat_');
      return;
    }
    setTokenError('');
    // Store in chrome.storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ githubToken: token, demoMode: false });
      chrome.runtime.sendMessage({ type: 'SET_TOKEN', token });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddRepo = () => {
    const parts = newRepo.trim().split('/');
    if (parts.length !== 2) return;
    const [owner, repoName] = parts;
    if (repos.find((r) => r.owner === owner && r.repoName === repoName)) return;
    setRepos((prev) => [...prev, { id: `repo-${Date.now()}`, owner, repoName, isActive: true }]);
    setNewRepo('');
  };

  const handleRemoveRepo = (id) => {
    setRepos((prev) => prev.filter((r) => r.id !== id));
  };

  const handleIntervalChange = (val) => {
    setInterval_(val);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ pollingInterval: val });
    }
  };

  return (
    <div className="space-y-4">
      {/* GitHub Token */}
      <div className="card">
        <h2 className="text-gh-text font-semibold text-sm mb-3">GitHub Token</h2>
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveToken()}
            className="flex-1 bg-gh-bg border border-gh-border text-gh-text text-xs 
                       font-mono px-3 py-2 rounded-md outline-none 
                       focus:border-gh-blue transition-colors placeholder:text-gh-muted/50"
          />
          <button onClick={handleSaveToken} className="btn-primary">
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
        {tokenError && <p className="text-red-400 text-[10px] mt-1.5 font-mono">{tokenError}</p>}
        <p className="text-gh-muted text-[10px] mt-2 font-mono">
          Requires repo, workflow read scopes. Stored locally.
        </p>
      </div>

      {/* Connected Repos */}
      <div className="card">
        <h2 className="text-gh-text font-semibold text-sm mb-3">Connected Repositories</h2>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="owner/repo-name"
            value={newRepo}
            onChange={(e) => setNewRepo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddRepo()}
            className="flex-1 bg-gh-bg border border-gh-border text-gh-text text-xs 
                       font-mono px-3 py-2 rounded-md outline-none 
                       focus:border-gh-blue transition-colors placeholder:text-gh-muted/50"
          />
          <button onClick={handleAddRepo} className="btn-secondary px-3">Add</button>
        </div>
        <div className="space-y-1.5">
          {repos.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-gh-bg border border-gh-border text-xs"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-gh-green shrink-0" />
              <span className="text-gh-text font-mono flex-1">{r.owner}/{r.repoName}</span>
              <button
                onClick={() => handleRemoveRepo(r.id)}
                className="text-gh-muted hover:text-red-400 transition-colors text-xs"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="card">
        <h2 className="text-gh-text font-semibold text-sm mb-3">Notification Preferences</h2>
        <div className="space-y-3">
          {[
            { key: 'pushNudges',    label: 'Push Nudges',    desc: 'Alert when commits are unpushed 2h+' },
            { key: 'pullNudges',    label: 'Pull Nudges',    desc: 'Alert when branch is behind' },
            { key: 'ciFailures',    label: 'CI Failures',    desc: 'Alert on pipeline failure' },
            { key: 'staleBranches', label: 'Stale Branches', desc: 'Alert on 7+ day inactive branches' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="text-gh-text text-xs">{label}</p>
                <p className="text-gh-muted text-[10px] font-mono">{desc}</p>
              </div>
              <Toggle
                checked={prefs[key]}
                onChange={(val) => setPrefs((p) => ({ ...p, [key]: val }))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Polling Interval */}
      <div className="card">
        <h2 className="text-gh-text font-semibold text-sm mb-3">Polling Interval</h2>
        <div className="flex gap-2">
          {INTERVAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleIntervalChange(opt.value)}
              className={`flex-1 py-1.5 text-xs font-mono rounded-md border transition-all duration-150 ${
                interval === opt.value
                  ? 'border-gh-blue text-gh-blue bg-gh-blue/10'
                  : 'border-gh-border text-gh-muted hover:border-gh-blue/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
