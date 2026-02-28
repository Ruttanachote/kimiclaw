// Rate Limiting Configuration
// จำกัดจำนวน requests ป้องกัน DoS/Abuse

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('../config/redis');

// Create rate limiter with Redis store
const createLimiter = (options) => {
  return rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: 'rl:'
    }),
    standardHeaders: true,
    legacyHeaders: false,
    ...options
  });
};

// Different rate limits for different endpoints
const rateLimits = {
  // General API - 100 requests per minute
  general: createLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        retryAfter: 60
      }
    }
  }),

  // Authentication - 5 attempts per 15 minutes
  auth: createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    skipSuccessfulRequests: true,
    message: {
      success: false,
      error: {
        code: 'TOO_MANY_ATTEMPTS',
        message: 'Too many login attempts, please try again in 15 minutes',
        retryAfter: 900
      }
    }
  }),

  // AI Generation - 20 requests per minute (expensive)
  ai: createLimiter({
    windowMs: 60 * 1000,
    max: 20,
    message: {
      success: false,
      error: {
        code: 'AI_RATE_LIMIT',
        message: 'AI generation limit reached, please slow down',
        retryAfter: 60
      }
    }
  }),

  // File upload - 10 uploads per minute
  upload: createLimiter({
    windowMs: 60 * 1000,
    max: 10,
    message: {
      success: false,
      error: {
        code: 'UPLOAD_RATE_LIMIT',
        message: 'Upload limit reached, please try again later',
        retryAfter: 60
      }
    }
  }),

  // WebSocket - 100 messages per minute per connection
  websocket: {
    windowMs: 60 * 1000,
    max: 100,
    keyGenerator: (clientId) => `ws:${clientId}`
  }
};

// WebSocket rate limiting
class WebSocketRateLimiter {
  constructor() {
    this.clients = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  checkLimit(clientId) {
    const now = Date.now();
    const windowMs = rateLimits.websocket.windowMs;
    const max = rateLimits.websocket.max;
    
    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: max - 1 };
    }
    
    const client = this.clients.get(clientId);
    
    // Reset if window has passed
    if (now > client.resetTime) {
      client.count = 1;
      client.resetTime = now + windowMs;
      return { allowed: true, remaining: max - 1 };
    }
    
    // Check limit
    if (client.count >= max) {
      return { 
        allowed: false, 
        remaining: 0,
        resetIn: Math.ceil((client.resetTime - now) / 1000)
      };
    }
    
    client.count++;
    return { allowed: true, remaining: max - client.count };
  }

  cleanup() {
    const now = Date.now();
    for (const [clientId, client] of this.clients) {
      if (now > client.resetTime + 60000) {
        this.clients.delete(clientId);
      }
    }
  }

  removeClient(clientId) {
    this.clients.delete(clientId);
  }
}

// IP-based rate limiting for anonymous users
const anonymousLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
  skip: (req) => req.user != null, // Skip if authenticated
  message: {
    success: false,
    error: {
      code: 'ANONYMOUS_RATE_LIMIT',
      message: 'Please login for higher limits'
    }
  }
});

// Burst protection - smooth out traffic spikes
const burstProtection = (req, res, next) => {
  const now = Date.now();
  const clientId = req.user?.id || req.ip;
  
  if (!req.app.locals.requestTimestamps) {
    req.app.locals.requestTimestamps = new Map();
  }
  
  const timestamps = req.app.locals.requestTimestamps;
  
  if (!timestamps.has(clientId)) {
    timestamps.set(clientId, []);
  }
  
  const clientTimestamps = timestamps.get(clientId);
  const oneSecondAgo = now - 1000;
  
  // Remove old timestamps
  while (clientTimestamps.length > 0 && clientTimestamps[0] < oneSecondAgo) {
    clientTimestamps.shift();
  }
  
  // Check burst (max 10 per second)
  if (clientTimestamps.length >= 10) {
    return res.status(429).json({
      success: false,
      error: {
        code: 'BURST_PROTECTION',
        message: 'Request burst detected, please slow down'
      }
    });
  }
  
  clientTimestamps.push(now);
  next();
};

module.exports = {
  rateLimits,
  WebSocketRateLimiter,
  anonymousLimiter,
  burstProtection
};
