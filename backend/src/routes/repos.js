const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const GitHubClient = require('../services/githubClient');

// Helper: get user from token
async function getUserFromToken(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const gh = new GitHubClient(token);
  const { valid, user } = await gh.validateToken();
  if (!valid) return null;
  const dbUser = await prisma.user.findUnique({ where: { githubUserId: String(user.id) } });
  return { dbUser, token };
}

// GET /api/repos — list connected repos
router.get('/', async (req, res) => {
  try {
    const auth = await getUserFromToken(req);
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });

    const repos = await prisma.repository.findMany({
      where: { userId: auth.dbUser.id, isActive: true },
      orderBy: { addedAt: 'desc' },
    });
    res.json(repos);
  } catch (err) {
    console.error('[Repos] GET /:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/repos — add a repo
router.post('/', async (req, res) => {
  try {
    const auth = await getUserFromToken(req);
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });

    const { owner, repoName } = req.body;
    if (!owner || !repoName) return res.status(400).json({ error: 'owner and repoName are required' });

    // Verify repo exists on GitHub
    const gh = new GitHubClient(auth.token);
    let defaultBranch = 'main';
    try {
      const repoData = await gh.client?.get(`/repos/${owner}/${repoName}`);
      defaultBranch = repoData?.data?.default_branch || 'main';
    } catch {
      // proceed with default
    }

    const repo = await prisma.repository.upsert({
      where: { userId_owner_repoName: { userId: auth.dbUser.id, owner, repoName } },
      update: { isActive: true, defaultBranch },
      create: {
        userId: auth.dbUser.id,
        owner,
        repoName,
        defaultBranch,
        isActive: true,
      },
    });

    res.status(201).json(repo);
  } catch (err) {
    console.error('[Repos] POST /:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/repos/:id — remove a repo
router.delete('/:id', async (req, res) => {
  try {
    const auth = await getUserFromToken(req);
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });

    const repo = await prisma.repository.findFirst({
      where: { id: req.params.id, userId: auth.dbUser.id },
    });
    if (!repo) return res.status(404).json({ error: 'Repository not found' });

    await prisma.repository.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[Repos] DELETE /:id:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
