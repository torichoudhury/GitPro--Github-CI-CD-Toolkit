# GitPro — GitHub Native CI/CD Toolkit

> A full-stack Chrome Extension for real-time GitHub CI/CD pipeline monitoring, branch diagnostics, and smart developer nudges.

![GitPro Banner](extension/icons/icon128.png)

---

## Features

- **Workflow Visualization** — Animated pipeline stages (Build → Lint → Test → Deploy) with log drawer
- **Real-time Monitor** — Run ID, trigger, duration, success rate, animated progress bar (auto-refreshes every 15s)
- **Pipeline Runs** — Paginated table of recent workflow runs with status badges
- **Diagnostics** — Branch divergence, conflict risk score, push/pull nudges, stale branch detector
- **Config Manager** — GitHub token, connected repos, notification preferences, polling interval
- **Background Service Worker** — Alarm-based polling + Chrome notifications for nudges
- **GitHub Content Script** — Floating status bar injected on github.com pages
- **Demo Mode** — Works without a GitHub token via `/api/mock/dashboard`

---

## Project Structure

```
gitpro/
├── extension/          # Chrome Extension (Vite + React + Tailwind)
│   ├── manifest.json   # Manifest V3
│   ├── background.js   # Service worker (polling, notifications)
│   ├── content.js      # GitHub status bar injection
│   ├── popup/          # React app (880×620px)
│   │   ├── App.jsx
│   │   └── pages/      # Dashboard, WorkflowVis, PipelineRuns, Diagnostics, ConfigManager
│   └── components/     # Sidebar, PipelineStage, MetricCard, NudgeBanner, LogDrawer
└── backend/            # Node.js + Express + Prisma + Redis
    ├── src/
    │   ├── index.js
    │   ├── routes/     # auth, repos, pipeline, diagnostics, nudges, webhooks, mock
    │   ├── services/   # githubClient, logParser, diagnosticsEngine, nudgeEngine
    │   └── jobs/       # cronScheduler (5min diagnostics)
    └── prisma/         # schema.prisma
```

---

## Quick Start

### Backend

```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL, REDIS_URL, GITHUB_WEBHOOK_SECRET, JWT_SECRET
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

The API runs on `http://localhost:3000`.  
Test demo mode: `GET http://localhost:3000/api/mock/dashboard`

### Chrome Extension

```bash
cd extension
npm install
npm run build   # outputs to extension/dist/
```

Then in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load Unpacked** → select the `extension/` folder (or `extension/dist/` after build)

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection URL |
| `GITHUB_WEBHOOK_SECRET` | HMAC secret for webhook signature verification |
| `JWT_SECRET` | JWT signing secret (min 32 chars) |
| `PORT` | API server port (default: 3000) |
| `CORS_ORIGIN` | Chrome extension origin (e.g. `chrome-extension://YOUR_ID`) |

---

## API Endpoints

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/token` | Validate & store GitHub token |
| GET | `/api/auth/user` | Get current GitHub user |
| GET | `/api/repos` | List connected repos |
| POST | `/api/repos` | Add a repo |
| GET | `/api/pipeline/:owner/:repo/runs` | Recent pipeline runs |
| GET | `/api/pipeline/:owner/:repo/runs/:runId/logs` | Parsed CI logs |
| GET | `/api/diagnostics/:owner/:repo/:branch` | Full diagnostics snapshot |
| GET | `/api/nudges/:userId` | Active nudges for user |
| POST | `/api/nudges/:nudgeId/dismiss` | Dismiss a nudge |
| POST | `/api/webhooks/github` | GitHub webhook receiver |
| GET | `/api/mock/dashboard` | Mock dashboard data (demo mode) |

---

## Deploy

**Backend** — Ready for [Railway](https://railway.app) or [Render](https://render.com).  
Add environment variables in your platform dashboard and run `npm start`.

**Extension** — Build with `npm run build`, then publish via Chrome Web Store Developer Dashboard.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension UI | React 18, Tailwind CSS, Vite |
| Extension Runtime | Manifest V3, Chrome APIs |
| Backend | Node.js, Express |
| ORM | Prisma + PostgreSQL |
| Cache | Redis (ioredis) |
| GitHub API | REST v3 (octokit-compatible) |
| Scheduling | node-cron |

---

## Design Tokens

| Token | Value |
|---|---|
| Background | `#0d1117` |
| Card | `#161b22` |
| Border | `#30363d` |
| Text | `#e6edf3` |
| Muted | `#8b949e` |
| Green (success) | `#3fb950` |
| Blue (active) | `#58a6ff` |
| Red (failure) | `#f85149` |
| Yellow (warn) | `#d29922` |

Typography: **Inter** (UI) + **JetBrains Mono** (metrics/code)

---

*Built with ❤️ for GitHub-native developer workflows.*
