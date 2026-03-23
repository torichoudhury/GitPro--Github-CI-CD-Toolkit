const cron = require('node-cron');
const { runAllDiagnostics } = require('../services/diagnosticsEngine');

let diagnosticsJob = null;

/**
 * Start the cron scheduler for diagnostics (every 5 minutes)
 */
function startScheduler() {
  if (diagnosticsJob) {
    console.log('[CronScheduler] Scheduler already running.');
    return;
  }

  // Run every 5 minutes
  diagnosticsJob = cron.schedule('*/5 * * * *', async () => {
    console.log('[CronScheduler] Running diagnostics job...');
    try {
      await runAllDiagnostics();
    } catch (err) {
      console.error('[CronScheduler] Diagnostics job error:', err.message);
    }
  });

  console.log('✅ [CronScheduler] Diagnostics job started (every 5 minutes)');
}

/**
 * Stop the scheduler (for graceful shutdown)
 */
function stopScheduler() {
  if (diagnosticsJob) {
    diagnosticsJob.stop();
    diagnosticsJob = null;
    console.log('[CronScheduler] Scheduler stopped.');
  }
}

module.exports = { startScheduler, stopScheduler };
