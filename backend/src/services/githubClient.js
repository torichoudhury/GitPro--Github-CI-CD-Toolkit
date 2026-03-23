const axios = require('axios');
const { cacheGet, cacheSet } = require('../lib/redis');

const GITHUB_API = 'https://api.github.com';
const CACHE_TTL = 30; // seconds

/**
 * Create an authenticated Axios instance for the GitHub REST API.
 * Tracks rate limit headers and emits warnings.
 */
function createGitHubClient(token) {
  const client = axios.create({
    baseURL: GITHUB_API,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    timeout: 15000,
  });

  // Response interceptor — track rate limit
  client.interceptors.response.use(
    (response) => {
      const remaining = parseInt(response.headers['x-ratelimit-remaining'] ?? '1000', 10);
      const reset = response.headers['x-ratelimit-reset'];
      if (remaining < 100) {
        console.warn(`⚠️ GitHub rate limit low: ${remaining} remaining (resets at ${new Date(reset * 1000).toISOString()})`);
        response._rateLimitWarning = {
          remaining,
          resetAt: new Date(reset * 1000).toISOString(),
        };
      }
      return response;
    },
    (error) => {
      if (error.response?.status === 403 && error.response?.headers['x-ratelimit-remaining'] === '0') {
        const reset = error.response.headers['x-ratelimit-reset'];
        error.rateLimitExceeded = true;
        error.resetAt = new Date(reset * 1000).toISOString();
      }
      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * Fetch with Redis caching. Cache key is derived from the URL.
 */
async function cachedFetch(client, url, params = {}) {
  const cacheKey = `gh:${url}:${JSON.stringify(params)}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const response = await client.get(url, { params });
  await cacheSet(cacheKey, response.data, CACHE_TTL);
  return response.data;
}

class GitHubClient {
  constructor(token) {
    this.token = token;
    this.client = createGitHubClient(token);
  }

  /** Get authenticated user */
  async getUser() {
    return cachedFetch(this.client, '/user');
  }

  /** Validate token by calling /user */
  async validateToken() {
    try {
      const user = await this.getUser();
      return { valid: true, user };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  /** List repos for authenticated user */
  async listRepos(page = 1, perPage = 30) {
    return cachedFetch(this.client, '/user/repos', {
      sort: 'pushed',
      per_page: perPage,
      page,
    });
  }

  /** Get workflow runs for a repo */
  async getWorkflowRuns(owner, repo, options = {}) {
    return cachedFetch(this.client, `/repos/${owner}/${repo}/actions/runs`, {
      per_page: options.perPage ?? 10,
      page: options.page ?? 1,
      branch: options.branch,
      event: options.event,
    });
  }

  /** Get a single workflow run */
  async getWorkflowRun(owner, repo, runId) {
    return cachedFetch(this.client, `/repos/${owner}/${repo}/actions/runs/${runId}`);
  }

  /** Get jobs for a run */
  async getRunJobs(owner, repo, runId) {
    return cachedFetch(this.client, `/repos/${owner}/${repo}/actions/runs/${runId}/jobs`);
  }

  /** Get raw logs download URL for a run */
  async getRunLogsUrl(owner, repo, runId) {
    try {
      const response = await this.client.get(
        `/repos/${owner}/${repo}/actions/runs/${runId}/logs`,
        { maxRedirects: 0, validateStatus: (s) => s === 302 || s === 200 }
      );
      return response.headers.location || null;
    } catch {
      return null;
    }
  }

  /** Compare two branches/commits */
  async compareBranches(owner, repo, base, head) {
    return cachedFetch(this.client, `/repos/${owner}/${repo}/compare/${base}...${head}`);
  }

  /** List branches */
  async listBranches(owner, repo) {
    return cachedFetch(this.client, `/repos/${owner}/${repo}/branches`, { per_page: 100 });
  }

  /** Get commits for a branch */
  async getCommits(owner, repo, branch, since) {
    const params = { sha: branch, per_page: 50 };
    if (since) params.since = since;
    return cachedFetch(this.client, `/repos/${owner}/${repo}/commits`, params);
  }
}

module.exports = GitHubClient;
