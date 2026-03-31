import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Loader2,
  Key,
  GitBranch,
  BellRing,
  Timer,
} from "lucide-react";
import { useCIPipeline } from "../contexts/CIPipelineContext";
import { validateToken, getRepoInfo, setToken } from "../services/githubAPIService";
import type { PollingInterval } from "../types";

const POLLING_OPTIONS: { label: string; value: PollingInterval }[] = [
  { label: "15 s", value: 15 },
  { label: "30 s", value: 30 },
  { label: "1 min", value: 60 },
  { label: "5 min", value: 300 },
];

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="toggle-track"
      style={{ background: checked ? "#3fb950" : "#30363d" }}
    >
      <div
        className="toggle-thumb"
        style={{ left: checked ? "23px" : "3px" }}
      />
    </button>
  );
}

export const ConfigManager: React.FC = () => {
  const { config, setConfig, activeRepo, setActiveRepo } = useCIPipeline();

  // Token section
  const [tokenInput, setTokenInput] = useState(config.githubToken);
  const [showToken, setShowToken] = useState(false);
  const [validating, setValidating] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<"valid" | "invalid" | null>(
    config.githubToken ? "valid" : null
  );
  const [tokenLogin, setTokenLogin] = useState(config.githubUsername);

  // Repo section
  const [repoInput, setRepoInput] = useState("");
  const [addingRepo, setAddingRepo] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);

  const handleValidateToken = async () => {
    setValidating(true);
    setTokenStatus(null);
    try {
      const result = await validateToken(tokenInput);
      if (result.valid) {
        setTokenStatus("valid");
        setTokenLogin(result.login ?? "");
        setToken(tokenInput);
        setConfig({
          githubToken: tokenInput,
          githubUsername: result.login ?? "",
        });
      } else {
        setTokenStatus("invalid");
      }
    } catch {
      setTokenStatus("invalid");
    } finally {
      setValidating(false);
    }
  };

  const handleAddRepo = async () => {
    const trimmed = repoInput.trim();
    if (!trimmed || !trimmed.includes("/")) {
      setRepoError("Use owner/repo-name format");
      return;
    }
    if (config.connectedRepos.find((r) => r.fullName === trimmed)) {
      setRepoError("Already added");
      return;
    }
    setAddingRepo(true);
    setRepoError(null);
    try {
      const info = await getRepoInfo(trimmed);
      if (!info) {
        setRepoError("Repo not found or token lacks access");
        return;
      }
      const newRepos = [...config.connectedRepos, info];
      setConfig({ connectedRepos: newRepos });
      setActiveRepo(newRepos[0]);
      setRepoInput("");
    } catch (e: any) {
      setRepoError(e.message ?? "Failed to add repo");
    } finally {
      setAddingRepo(false);
    }
  };

  const handleRemoveRepo = (fullName: string) => {
    const newRepos = config.connectedRepos.filter((r) => r.fullName !== fullName);
    setConfig({ connectedRepos: newRepos });
    setActiveRepo(newRepos[0] ?? null);
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto gap-6" style={{ background: "#0d1117" }}>
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "#e6edf3" }}>Settings</h2>
        <p className="text-xs mt-0.5" style={{ color: "#8b949e" }}>Configure your GitHub token, repos, nudges, and polling</p>
      </div>

      <div className="card p-4" style={{ background: "rgba(22, 27, 34, 0.7)", borderColor: "rgba(88, 166, 255, 0.25)" }}>
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#58a6ff" }}>Current Session</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "#6e7681" }}>Active Repo</p>
            <p className="text-xs font-mono truncate" style={{ color: "#e6edf3" }}>{activeRepo?.fullName ?? "None"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "#6e7681" }}>Connected Repos</p>
            <p className="text-xs font-mono" style={{ color: "#e6edf3" }}>{config.connectedRepos.length}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "#6e7681" }}>Polling</p>
            <p className="text-xs font-mono" style={{ color: "#e6edf3" }}>{config.pollingInterval}s</p>
          </div>
        </div>
      </div>

      {/* Token */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Key size={16} style={{ color: "#58a6ff" }} />
          <h3 className="font-semibold text-sm" style={{ color: "#e6edf3" }}>GitHub Personal Access Token</h3>
        </div>

        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <input
              type={showToken ? "text" : "password"}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ghp_..."
              className="w-full pr-10 font-mono"
            />
            <button
              onClick={() => setShowToken((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2"
              style={{ color: "#6e7681" }}
            >
              {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button
            onClick={handleValidateToken}
            disabled={validating || !tokenInput}
            className="flex items-center gap-2 px-4 py-2 rounded font-mono text-sm disabled:opacity-40"
            style={{ background: "#1f6feb", color: "#e6edf3" }}
          >
            {validating ? <Loader2 size={13} className="spin" /> : null}
            Validate
          </button>
        </div>

        {tokenStatus === "valid" && (
          <div className="flex items-center gap-2 text-xs" style={{ color: "#3fb950" }}>
            <CheckCircle size={13} />
            Authenticated as <strong>{tokenLogin}</strong>
          </div>
        )}
        {tokenStatus === "invalid" && (
          <div className="flex items-center gap-2 text-xs" style={{ color: "#f85149" }}>
            <XCircle size={13} />
            Token invalid or insufficient scopes (need repo + workflow)
          </div>
        )}
        <p className="text-xs mt-2" style={{ color: "#6e7681" }}>
          Token from <code className="font-mono" style={{ color: "#8b949e" }}>.env</code> is pre-loaded. Changes here override it for this session.
        </p>
      </motion.div>

      {/* Repos */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch size={16} style={{ color: "#3fb950" }} />
          <h3 className="font-semibold text-sm" style={{ color: "#e6edf3" }}>Connected Repositories</h3>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={repoInput}
            onChange={(e) => { setRepoInput(e.target.value); setRepoError(null); }}
            placeholder="owner/repo-name"
            className="flex-1 font-mono"
            onKeyDown={(e) => e.key === "Enter" && handleAddRepo()}
          />
          <button
            onClick={handleAddRepo}
            disabled={addingRepo || !repoInput.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded font-mono text-sm disabled:opacity-40"
            style={{ background: "#3fb950", color: "#0d1117", fontWeight: 600 }}
          >
            {addingRepo ? <Loader2 size={13} className="spin" /> : <Plus size={13} />}
            Add
          </button>
        </div>

        {repoError && (
          <p className="text-xs mb-2" style={{ color: "#f85149" }}>{repoError}</p>
        )}

        <div className="space-y-2">
          {config.connectedRepos.map((repo) => {
            const isActive = activeRepo?.fullName === repo.fullName;
            return (
              <div
                key={repo.fullName}
                className="flex items-center justify-between px-3 py-3 rounded"
                style={{
                  background: isActive ? "#1f6feb20" : "#0d1117",
                  border: isActive ? "1px solid #1f6feb50" : "1px solid #21262d",
                }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-semibold" style={{ color: isActive ? "#58a6ff" : "#e6edf3" }}>
                      {repo.fullName}
                    </p>
                    {isActive && (
                      <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "#6e7681" }}>
                    default stream: {repo.defaultBranch}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!isActive && (
                    <button
                      onClick={() => setActiveRepo(repo)}
                      className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-colors border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10"
                    >
                      Use Repo
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveRepo(repo.fullName)}
                    className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
          {config.connectedRepos.length === 0 && (
            <div className="py-6 text-center border border-dashed border-white/10 rounded-lg">
              <p className="text-xs font-mono text-tertiary">No repos configured.</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Nudge toggles */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <BellRing size={16} style={{ color: "#d29922" }} />
          <h3 className="font-semibold text-sm" style={{ color: "#e6edf3" }}>Smart Nudges</h3>
        </div>
        <div className="space-y-3">
          {(
            [
              { key: "push", label: "Push Nudge", desc: "Alert when no push for 2+ hours" },
              { key: "pull", label: "Pull Nudge", desc: "Alert when base branch has new commits" },
              { key: "stale_branch", label: "Stale Branch", desc: "Alert when branch inactive 7+ days" },
              { key: "ci_failure", label: "CI Failure", desc: "Alert immediately when pipeline fails" },
            ] as const
          ).map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: "#e6edf3" }}>{label}</p>
                <p className="text-xs" style={{ color: "#6e7681" }}>{desc}</p>
              </div>
              <Toggle
                checked={config.nudgeToggles[key]}
                onChange={(v) =>
                  setConfig({ nudgeToggles: { ...config.nudgeToggles, [key]: v } })
                }
              />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Polling interval */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Timer size={16} style={{ color: "#58a6ff" }} />
          <h3 className="font-semibold text-sm" style={{ color: "#e6edf3" }}>Polling Interval</h3>
        </div>
        <div className="flex gap-2">
          {POLLING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setConfig({ pollingInterval: opt.value })}
              className="px-3 py-1.5 rounded font-mono text-xs"
              style={{
                background:
                  config.pollingInterval === opt.value
                    ? "#1f6feb"
                    : "#161b22",
                color:
                  config.pollingInterval === opt.value ? "#e6edf3" : "#8b949e",
                border:
                  config.pollingInterval === opt.value
                    ? "1px solid #58a6ff"
                    : "1px solid #30363d",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

// Alias for Dashboard import
export const SettingsPanel = ConfigManager;
