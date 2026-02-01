const Redis = require('ioredis');

let redis;

function getRedis() {
  if (!process.env.REDIS_URL) return null;
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, { lazyConnect: true });
  }
  return redis;
}

async function redisPing() {
  const client = getRedis();
  if (!client) return { enabled: false };
  try {
    if (client.status === 'end') redis = null;
    await client.connect();
    await client.ping();
    return { enabled: true, ok: true };
  } catch (err) {
    return { enabled: true, ok: false, error: err.message };
  }
}

async function redisGet(key) {
  const client = getRedis();
  if (!client) return null;
  try {
    await client.connect();
    return await client.get(key);
  } catch (err) {
    return null;
  }
}

async function redisSet(key, value, ttlSec = 60) {
  const client = getRedis();
  if (!client) return;
  try {
    await client.connect();
    await client.set(key, value, 'EX', ttlSec);
  } catch (err) {
    // ignore
  }
}

async function redisDelPattern(pattern) {
  const client = getRedis();
  if (!client) return;
  try {
    await client.connect();
    let cursor = '0';
    do {
      const [next, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      if (keys.length) await client.del(keys);
      cursor = next;
    } while (cursor !== '0');
  } catch (err) {
    // ignore
  }
}

module.exports = { getRedis, redisPing, redisGet, redisSet, redisDelPattern };
