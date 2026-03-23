require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { startScheduler, stopScheduler } = require('./jobs/cronScheduler');

// Routes
const authRoutes        = require('./routes/auth');
const repoRoutes        = require('./routes/repos');
const pipelineRoutes    = require('./routes/pipeline');
const diagnosticsRoutes = require('./routes/diagnostics');
const nudgesRoutes      = require('./routes/nudges');
const webhooksRoutes    = require('./routes/webhooks');
const mockRoutes        = require('./routes/mock');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security & parsing ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));

// ── Rate limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});
app.use('/api/', limiter);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/repos',       repoRoutes);
app.use('/api/pipeline',    pipelineRoutes);
app.use('/api/diagnostics', diagnosticsRoutes);
app.use('/api/nudges',      nudgesRoutes);
app.use('/api/webhooks',    webhooksRoutes);
app.use('/api/mock',        mockRoutes);

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message, err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── Start server ──────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`🚀 GitPro API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  startScheduler();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  stopScheduler();
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

module.exports = app;
