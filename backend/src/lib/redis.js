const Redis = require('ioredis');

let redis;

try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) return true;
      return false;
    },
  });

  redis.on('connect', () => console.log('✅ Redis connected'));
  redis.on('error', (err) => console.error('❌ Redis error:', err.message));
} catch (err) {
  console.error('❌ Redis initialization failed:', err.message);
  // Fallback no-op Redis when Redis is unavailable
  redis = {
    get: async () => null,
    set: async () => null,
    del: async () => null,
    setex: async () => null,
  };
}

/**
 * Get value from cache
 * @param {string} key
 * @returns {Promise<any|null>}
 */
async function cacheGet(key) {
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

/**
 * Set value in cache with TTL (seconds)
 * @param {string} key
 * @param {any} value
 * @param {number} ttl - seconds (default 30)
 */
async function cacheSet(key, value, ttl = 30) {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch {
    // silently fail
  }
}

/**
 * Delete key from cache
 * @param {string} key
 */
async function cacheDel(key) {
  try {
    await redis.del(key);
  } catch {
    // silently fail
  }
}

module.exports = { redis, cacheGet, cacheSet, cacheDel };
