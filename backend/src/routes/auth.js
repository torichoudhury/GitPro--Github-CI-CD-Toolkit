const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const GitHubClient = require('../services/githubClient');

// POST /api/auth/token — validate and store GitHub token
router.post('/token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const gh = new GitHubClient(token);
    const { valid, user, error } = await gh.validateToken();

    if (!valid) return res.status(401).json({ error: `Invalid token: ${error}` });

    // Upsert user
    const dbUser = await prisma.user.upsert({
      where: { githubUserId: String(user.id) },
      update: {
        githubUsername: user.login,
        avatarUrl: user.avatar_url,
        githubToken: token,
        updatedAt: new Date(),
      },
      create: {
        githubUserId: String(user.id),
        githubUsername: user.login,
        avatarUrl: user.avatar_url,
        githubToken: token,
      },
    });

    res.json({
      success: true,
      user: {
        id: dbUser.id,
        githubUsername: dbUser.githubUsername,
        avatarUrl: dbUser.avatarUrl,
      },
    });
  } catch (err) {
    console.error('[Auth] POST /token:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/user — get current authenticated user
router.get('/user', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const gh = new GitHubClient(token);
    const { valid, user, error } = await gh.validateToken();
    if (!valid) return res.status(401).json({ error });

    const dbUser = await prisma.user.findUnique({
      where: { githubUserId: String(user.id) },
    });

    res.json({
      id: dbUser?.id,
      githubUsername: user.login,
      avatarUrl: user.avatar_url,
      name: user.name,
    });
  } catch (err) {
    console.error('[Auth] GET /user:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/auth/token — revoke stored token
router.delete('/token', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const gh = new GitHubClient(token);
    const { user } = await gh.validateToken();
    if (user) {
      await prisma.user.updateMany({
        where: { githubUserId: String(user.id) },
        data: { githubToken: null },
      });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[Auth] DELETE /token:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
