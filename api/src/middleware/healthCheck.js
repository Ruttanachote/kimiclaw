// Health Check System
// ตรวจสอบสถานะทุก service ตลอดเวลา

const { Pool } = require('pg');
const redis = require('redis');
const axios = require('axios');

class HealthChecker {
  constructor() {
    this.checks = new Map();
    this.lastResults = new Map();
    this.checkInterval = null;
    
    // Database pool for health checks
    this.dbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'devstudio',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'devstudio',
      max: 5,
      connectionTimeoutMillis: 2000
    });
    
    // Redis client for health checks
    this.redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    this.setupChecks();
  }

  setupChecks() {
    // Database health check
    this.checks.set('database', async () => {
      const start = Date.now();
      try {
        const result = await this.dbPool.query('SELECT 1');
        return {
          status: 'healthy',
          responseTime: Date.now() - start,
          details: { connected: true }
        };
      } catch (err) {
        return {
          status: 'unhealthy',
          responseTime: Date.now() - start,
          error: err.message
        };
      }
    });

    // Redis health check
    this.checks.set('redis', async () => {
      const start = Date.now();
      try {
        await this.redisClient.ping();
        return {
          status: 'healthy',
          responseTime: Date.now() - start,
          details: { connected: true }
        };
      } catch (err) {
        return {
          status: 'unhealthy',
          responseTime: Date.now() - start,
          error: err.message
        };
      }
    });

    // AI Providers health check
    this.checks.set('ai-providers', async () => {
      const providers = [
        { name: 'anthropic', url: 'https://api.anthropic.com/v1/health', timeout: 5000 },
        { name: 'openai', url: 'https://api.openai.com/v1/models', timeout: 5000 },
        { name: 'google', url: 'https://generativelanguage.googleapis.com/v1/models', timeout: 5000 }
      ];
      
      const results = await Promise.all(
        providers.map(async (provider) => {
          const start = Date.now();
          try {
            await axios.get(provider.url, { 
              timeout: provider.timeout,
              validateStatus: () => true // Don't throw on error status
            });
            return {
              name: provider.name,
              status: 'healthy',
              responseTime: Date.now() - start
            };
          } catch (err) {
            return {
              name: provider.name,
              status: 'unhealthy',
              responseTime: Date.now() - start,
              error: err.message
            };
          }
        })
      );
      
      const healthy = results.filter(r => r.status === 'healthy');
      
      return {
        status: healthy.length > 0 ? 'healthy' : 'degraded',
        details: results,
        available: healthy.length
      };
    });

    // Agents health check
    this.checks.set('agents', async () => {
      const agents = ['research', 'uiux', 'frontend', 'backend', 'qa', 'pmba', 'supervisor', 'secretary'];
      
      const results = await Promise.all(
        agents.map(async (agent) => {
          try {
            // Check Redis for agent heartbeat
            const lastSeen = await this.redisClient.get(`agent:${agent}:heartbeat`);
            const isHealthy = lastSeen && (Date.now() - parseInt(lastSeen)) < 60000; // 1 minute
            
            return {
              name: agent,
              status: isHealthy ? 'healthy' : 'unhealthy',
              lastSeen: lastSeen ? new Date(parseInt(lastSeen)).toISOString() : null
            };
          } catch (err) {
            return {
              name: agent,
              status: 'unknown',
              error: err.message
            };
          }
        })
      );
      
      const healthy = results.filter(r => r.status === 'healthy');
      
      return {
        status: healthy.length === agents.length ? 'healthy' : 
                healthy.length > 0 ? 'degraded' : 'unhealthy',
        details: results,
        healthy: healthy.length,
        total: agents.length
      };
    });

    // Disk space check
    this.checks.set('disk', async () => {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      try {
        const { stdout } = await execAsync('df -h / | tail -1');
        const parts = stdout.trim().split(/\s+/);
        const usage = parseInt(parts[4].replace('%', ''));
        
        return {
          status: usage > 90 ? 'critical' : usage > 80 ? 'warning' : 'healthy',
          details: {
            total: parts[1],
            used: parts[2],
            available: parts[3],
            usage: usage + '%'
          }
        };
      } catch (err) {
        return {
          status: 'unknown',
          error: err.message
        };
      }
    });

    // Memory check
    this.checks.set('memory', async () => {
      const used = process.memoryUsage();
      const total = require('os').totalmem();
      const usagePercent = (used.heapUsed / total) * 100;
      
      return {
        status: usagePercent > 90 ? 'critical' : usagePercent > 80 ? 'warning' : 'healthy',
        details: {
          heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(used.heapTotal / 1024 / 1024) + 'MB',
          rss: Math.round(used.rss / 1024 / 1024) + 'MB',
          usage: usagePercent.toFixed(2) + '%'
        }
      };
    });
  }

  async runAllChecks() {
    const results = {};
    let overallStatus = 'healthy';
    
    for (const [name, checkFn] of this.checks) {
      const start = Date.now();
      try {
        const result = await Promise.race([
          checkFn(),
          new Promise((_, reject) =
003e 
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          )
        ]);
        
        results[name] = {
          ...result,
          checkDuration: Date.now() - start
        };
        
        // Update overall status
        if (result.status === 'critical') {
          overallStatus = 'critical';
        } else if (result.status === 'unhealthy' && overallStatus !== 'critical') {
          overallStatus = 'unhealthy';
        } else if (result.status === 'degraded' && overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
        
      } catch (err) {
        results[name] = {
          status: 'error',
          error: err.message,
          checkDuration: Date.now() - start
        };
        overallStatus = 'unhealthy';
      }
    }
    
    const finalResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      checks: results
    };
    
    this.lastResults = finalResult;
    return finalResult;
  }

  startPeriodicChecks(intervalMs = 30000) {
    this.checkInterval = setInterval(async () => {
      const results = await this.runAllChecks();
      
      // Store in Redis for quick access
      await this.redisClient.setex(
        'health:status',
        60,
        JSON.stringify(results)
      );
      
      // Alert on critical issues
      if (results.status === 'critical') {
        console.error('🚨 CRITICAL HEALTH ALERT:', results);
        // TODO: Send alert to monitoring service
      }
      
    }, intervalMs);
    
    console.log(`✅ Health checks started (every ${intervalMs}ms)`);
  }

  stopPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async getLastResults() {
    if (Object.keys(this.lastResults).length === 0) {
      return this.runAllChecks();
    }
    return this.lastResults;
  }

  // Express middleware for health endpoint
  middleware() {
    return async (req, res) => {
      const results = await this.runAllChecks();
      
      const statusCode = results.status === 'healthy' ? 200 :
                        results.status === 'degraded' ? 200 :
                        results.status === 'warning' ? 200 : 503;
      
      res.status(statusCode).json(results);
    };
  }
}

// Singleton instance
const healthChecker = new HealthChecker();

module.exports = healthChecker;
