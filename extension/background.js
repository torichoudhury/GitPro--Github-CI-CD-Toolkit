// GitPro Background Service Worker (Manifest V3)

const API_BASE = 'http://localhost:3000'; // Change to your deployed backend URL

// ── Alarm setup ───────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async () => {
  const { pollingInterval = 30 } = await chrome.storage.local.get('pollingInterval');
  setupAlarm(pollingInterval);
  console.log('[GitPro] Extension installed. Polling every', pollingInterval, 'seconds.');
});

function setupAlarm(intervalSeconds) {
  chrome.alarms.clearAll();
  chrome.alarms.create('gitpro-poll', {
    delayInMinutes: intervalSeconds / 60,
    periodInMinutes: intervalSeconds / 60,
  });
}

// Listen for polling interval changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.pollingInterval) {
    setupAlarm(changes.pollingInterval.newValue);
  }
});

// ── Alarm handler — poll API ───────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'gitpro-poll') return;

  try {
    const { githubToken, userId, demoMode } = await chrome.storage.local.get([
      'githubToken', 'userId', 'demoMode',
    ]);

    if (demoMode) {
      await pollMockDashboard();
    } else if (githubToken) {
      await pollLiveDashboard(githubToken, userId);
    }
  } catch (err) {
    console.error('[GitPro] Polling error:', err.message);
  }
});

// ── Poll mock dashboard ────────────────────────────────────────────────────────
async function pollMockDashboard() {
  const response = await fetch(`${API_BASE}/api/mock/dashboard`);
  if (!response.ok) return;

  const data = await response.json();
  await chrome.storage.local.set({
    dashboardData: data,
    lastUpdated: Date.now(),
  });

  // Check for new nudges
  const { dismissedNudgeIds = [] } = await chrome.storage.local.get('dismissedNudgeIds');
  const newNudges = (data.nudges || []).filter(
    (n) => !n.dismissed && !dismissedNudgeIds.includes(n.id)
  );

  for (const nudge of newNudges) {
    await fireNotification(nudge);
  }
}

// ── Poll live dashboard ────────────────────────────────────────────────────────
async function pollLiveDashboard(token, userId) {
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch nudges
  if (userId) {
    const nudgesRes = await fetch(`${API_BASE}/api/nudges/${userId}`, { headers });
    if (nudgesRes.ok) {
      const nudges = await nudgesRes.json();
      const { dismissedNudgeIds = [] } = await chrome.storage.local.get('dismissedNudgeIds');
      const newNudges = nudges.filter(
        (n) => !n.dismissed && !dismissedNudgeIds.includes(n.id)
      );
      for (const nudge of newNudges) {
        await fireNotification(nudge);
      }
      await chrome.storage.local.set({ nudges, lastUpdated: Date.now() });
    }
  }
}

// ── Fire a Chrome notification ─────────────────────────────────────────────────
async function fireNotification(nudge) {
  const { dismissedNudgeIds = [] } = await chrome.storage.local.get('dismissedNudgeIds');
  if (dismissedNudgeIds.includes(nudge.id)) return;

  const iconMap = {
    push_nudge:   '⬆️',
    pull_nudge:   '⬇️',
    stale_branch: '🌿',
    ci_failure:   '❌',
  };

  chrome.notifications.create(`gitpro-${nudge.id}`, {
    type: 'basic',
    iconUrl: '../icons/icon128.png',
    title: `GitPro — ${nudge.nudgeType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`,
    message: nudge.message,
    priority: 2,
  });

  // Mark as seen (won't fire again until dismissed)
  dismissedNudgeIds.push(nudge.id);
  await chrome.storage.local.set({ dismissedNudgeIds });
}

// ── Message listener (from popup) ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_DEMO_MODE') {
    chrome.storage.local.set({ demoMode: message.value });
    sendResponse({ ok: true });
  }

  if (message.type === 'SET_TOKEN') {
    chrome.storage.local.set({ githubToken: message.token, demoMode: false });
    sendResponse({ ok: true });
  }

  if (message.type === 'GET_API_BASE') {
    sendResponse({ apiBase: API_BASE });
  }

  if (message.type === 'POLL_NOW') {
    pollMockDashboard().catch(console.error);
    sendResponse({ ok: true });
  }

  return true; // keep channel open for async response
});
