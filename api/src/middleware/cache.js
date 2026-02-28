// Caching System with Redis
// ลดการเรียก AI API ซ้ำ ๆ ประหยัดตังค์

const redis = require('../config/redis');
const crypto = require('crypto');

class CacheManager {
  constructor() {
    this.defaultTTL = 3600; // 1 hour
    this.prefixes = {
      ai: 'cache:ai:',
      user: 'cache:user:',
      project: 'cache:proj:',
      agent: 'cache:agent:'
    };
  }

  // Generate cache key from data
  generateKey(prefix, data) {
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');
    return `${prefix}${hash}`;
  }

  // Get cached data
  async get(key) {
    try {
      const data = await redis.get(key);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (err) {
      console.error('Cache get error:', err);
      return null;
    }
  }

  // Set cached data
  async set(key, value, ttl = this.defaultTTL) {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error('Cache set error:', err);
      return false;
    }
  }

  // Delete cached data
  async del(key) {
    try {
      await redis.del(key);
      return true;
    } catch (err) {
      console.error('Cache delete error:', err);
      return false;
    }
  }

  // Cache AI generation results
  async cacheAIResult(provider, model, prompt, result, ttl = 3600) {
    const key = this.generateKey(this.prefixes.ai, {
      provider,
      model,
      prompt: prompt.slice(0, 500) // Hash first 500 chars only
    });
    
    await this.set(key, {
      result,
      cachedAt: new Date().toISOString(),
      provider,
      model
    }, ttl);
    
    return key;
  }

  // Get cached AI result
  async getAIResult(provider, model, prompt) {
    const key = this.generateKey(this.prefixes.ai, {
      provider,
      model,
      prompt: prompt.slice(0, 500)
    });
    
    return await this.get(key);
  }

  // Cache with conditional refresh
  async getOrSet(key, getter, ttl = this.defaultTTL) {
    // Try to get from cache
    const cached = await this.get(key);
    if (cached) {
      return { ...cached, fromCache: true };
    }
    
    // Get fresh data
    const fresh = await getter();
    
    // Store in cache
    await this.set(key, fresh, ttl);
    
    return { ...fresh, fromCache: false };
  }

  // Cache user data
  async cacheUserData(userId, data, ttl = 1800) {
    const key = `${this.prefixes.user}${userId}`;
    await this.set(key, data, ttl);
  }

  // Get cached user data
  async getUserData(userId) {
    const key = `${this.prefixes.user}${userId}`;
    return await this.get(key);
  }

  // Invalidate user cache
  async invalidateUser(userId) {
    const key = `${this.prefixes.user}${userId}`;
    await this.del(key);
  }

  // Cache project data
  async cacheProjectData(projectId, data, ttl = 300) {
    const key = `${this.prefixes.project}${projectId}`;
    await this.set(key, data, ttl);
  }

  // Get cached project data
  async getProjectData(projectId) {
    const key = `${this.prefixes.project}${projectId}`;
    return await this.get(key);
  }

  // Invalidate project cache
  async invalidateProject(projectId) {
    const key = `${this.prefixes.project}${projectId}`;
    await this.del(key);
    
    // Also invalidate related patterns
    const pattern = `${this.prefixes.project}${projectId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  }

  // Cache agent memory
  async cacheAgentMemory(projectId, agentName, memory, ttl = 600) {
    const key = `${this.prefixes.agent}${projectId}:${agentName}`;
    await this.set(key, memory, ttl);
  }

  // Get cached agent memory
  async getAgentMemory(projectId, agentName) {
    const key = `${this.prefixes.agent}${projectId}:${agentName}`;
    return await this.get(key);
  }

  // Clear all cache
  async clearAll() {
    try {
      await redis.flushdb();
      return true;
    } catch (err) {
      console.error('Cache clear error:', err);
      return false;
    }
  }

  // Get cache stats
  async getStats() {
    try {
      const info = await redis.info('memory');
      const keys = await redis.keys('cache:*');
      
      return {
        totalKeys: keys.length,
        memoryInfo: info,
        prefixes: {
          ai: (await redis.keys(`${this.prefixes.ai}*`)).length,
          user: (await redis.keys(`${this.prefixes.user}*`)).length,
          project: (await redis.keys(`${this.prefixes.project}*`)).length,
          agent: (await redis.keys(`${this.prefixes.agent}*`)).length
        }
      };
    } catch (err) {
      console.error('Cache stats error:', err);
      return null;
    }
  }
}

// Singleton instance
const cacheManager = new CacheManager();

module.exports = cacheManager;
