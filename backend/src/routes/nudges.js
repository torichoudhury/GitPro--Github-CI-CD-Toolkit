const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// GET /api/nudges/:userId — get active nudges
router.get('/:userId', async (req, res) => {
  try {
    const nudges = await prisma.nudgeLog.findMany({
      where: { userId: req.params.userId, dismissed: false },
      orderBy: { triggeredAt: 'desc' },
      take: 20,
      include: {
        repository: { select: { owner: true, repoName: true } },
      },
    });
    res.json(nudges);
  } catch (err) {
    console.error('[Nudges] GET /:userId:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/nudges/:nudgeId/dismiss — dismiss a nudge
router.post('/:nudgeId/dismiss', async (req, res) => {
  try {
    const nudge = await prisma.nudgeLog.update({
      where: { id: req.params.nudgeId },
      data: { dismissed: true, dismissedAt: new Date() },
    });
    res.json({ success: true, nudge });
  } catch (err) {
    console.error('[Nudges] POST /dismiss:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
