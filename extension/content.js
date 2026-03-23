// GitPro Content Script — injected on github.com pages
(function () {
  'use strict';

  // Avoid double-injection
  if (document.getElementById('gitpro-status-bar')) return;

  // ── Detect repo + branch from URL/DOM ───────────────────────────────────────
  function detectRepoInfo() {
    const path = window.location.pathname.split('/').filter(Boolean);
    const owner    = path[0] || null;
    const repoName = path[1] || null;
    // Branch detection from DOM (branch selector button)
    const branchEl = document.querySelector(
      '[data-hotkey="w"] span, .branch-name, .css-truncate-target[data-menu-button]'
    );
    const branch   = branchEl?.textContent?.trim() || 'main';
    return { owner, repoName, branch };
  }

  // ── Poll cached data from chrome.storage ────────────────────────────────────
  async function getCachedData() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['dashboardData', 'nudges', 'lastUpdated'], resolve);
    });
  }

  // ── Status dot color ─────────────────────────────────────────────────────────
  function statusColor(status, conclusion) {
    if (status === 'in_progress') return '#58a6ff';
    if (conclusion === 'success')  return '#3fb950';
    if (conclusion === 'failure')  return '#f85149';
    return '#8b949e';
  }

  // ── Create floating status bar ───────────────────────────────────────────────
  function createStatusBar() {
    const bar = document.createElement('div');
    bar.id = 'gitpro-status-bar';
    bar.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 36px;
      background: #161b22;
      border-top: 1px solid #30363d;
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 12px;
      z-index: 9999;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #8b949e;
      cursor: pointer;
      user-select: none;
      transition: background 0.2s;
    `;

    bar.innerHTML = `
      <span style="color:#3fb950;font-weight:700;letter-spacing:0.05em;">GitPro</span>
      <span id="gp-pipeline-dot" style="width:8px;height:8px;border-radius:50%;background:#8b949e;display:inline-block;"></span>
      <span id="gp-pipeline-label" style="color:#8b949e;">Loading…</span>
      <span style="color:#30363d;">│</span>
      <span id="gp-divergence" style="color:#8b949e;">—</span>
      <span style="color:#30363d;">│</span>
      <span id="gp-nudge-badge" style="
        background:#58a6ff20;
        color:#58a6ff;
        padding:1px 6px;
        border-radius:10px;
        font-size:10px;
        display:none;
      ">0 nudges</span>
      <span style="margin-left:auto;color:#30363d;font-size:10px;">click to open GitPro ↗</span>
    `;

    bar.addEventListener('mouseenter', () => {
      bar.style.background = '#1c2128';
    });
    bar.addEventListener('mouseleave', () => {
      bar.style.background = '#161b22';
    });

    // Click opens extension popup
    bar.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
    });

    return bar;
  }

  // ── Update status bar with data ──────────────────────────────────────────────
  async function updateStatusBar() {
    const { dashboardData, nudges } = await getCachedData();
    const dot   = document.getElementById('gp-pipeline-dot');
    const label = document.getElementById('gp-pipeline-label');
    const div   = document.getElementById('gp-divergence');
    const badge = document.getElementById('gp-nudge-badge');

    if (!dot) return;

    // Pipeline status
    if (dashboardData?.monitor) {
      const m = dashboardData.monitor;
      const stages = dashboardData.pipeline?.stages || [];
      const activeStage = stages.find((s) => s.status === 'in_progress');
      const lastStage   = stages[stages.length - 1];
      const refStage    = activeStage || lastStage;

      const color = refStage
        ? statusColor(refStage.status, refStage.conclusion)
        : '#8b949e';
      dot.style.background = color;

      if (activeStage) {
        dot.style.boxShadow = `0 0 6px ${color}`;
        dot.style.animation = 'none';
      }

      label.textContent = activeStage
        ? `${activeStage.name} running…`
        : (lastStage?.conclusion === 'success' ? 'Pipeline passed' : 'Pipeline failed');
      label.style.color  = color;
    }

    // Divergence
    if (dashboardData?.diagnostics) {
      const d = dashboardData.diagnostics;
      const riskColors = { green: '#3fb950', yellow: '#d29922', red: '#f85149' };
      div.textContent = `↑${d.commitsAhead} ↓${d.commitsBehind}`;
      div.style.color = riskColors[d.riskLevel] || '#8b949e';
    }

    // Nudges badge
    const activeNudges = (nudges || dashboardData?.nudges || []).filter((n) => !n.dismissed);
    if (activeNudges.length > 0) {
      badge.style.display = 'inline-block';
      badge.textContent   = `${activeNudges.length} nudge${activeNudges.length > 1 ? 's' : ''}`;
    } else {
      badge.style.display = 'none';
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    const { owner, repoName } = detectRepoInfo();
    if (!owner || !repoName) return; // Only show on repo pages

    const bar = createStatusBar();
    document.body.appendChild(bar);
    updateStatusBar();

    // Refresh every 30s
    setInterval(updateStatusBar, 30000);

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.dashboardData || changes.nudges) {
        updateStatusBar();
      }
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
