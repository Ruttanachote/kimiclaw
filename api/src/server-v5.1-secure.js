// Enhanced Server v5.1 with Security & Reliability
// รวมทุก middleware ที่ปรับปรุงแล้ว

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const redis = require('./config/redis');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Security & Middleware
const securityConfig = require('./config/security');
const { validators, handleValidationErrors, sqlInjectionCheck } = require('./middleware/validation');
const { rateLimits, WebSocketRateLimiter, burstProtection } = require('./middleware/rateLimit');
const healthChecker = require('./middleware/healthCheck');
const { logger, errorHandler, asyncHandler, requestLogger, AppError } = require('./middleware/errorHandler');
const cacheManager = require('./middleware/cache');
const { withCircuitBreaker, aiRequest } = require('./middleware/resilience');
const { shutdownManager, createShutdownHandlers } = require('./middleware/gracefulShutdown');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:80'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sqlInjectionCheck);
app.use(requestLogger);
app.use(burstProtection);

// Database with proper pool config
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'devstudio',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'devstudio',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// JWT Secret from security config
const JWT_SECRET = securityConfig.get('jwt.secret');

// Connected WebSocket clients
const clients = new Map();
const wsRateLimiter = new WebSocketRateLimiter();

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    next(new AppError('Invalid or expired token', 401, 'INVALID_TOKEN'));
  }
};

// Routes with validation and rate limiting

// Health check
app.get('/health', healthChecker.middleware());

// Authentication (rate limited)
app.post('/auth/login', 
  rateLimits.auth,
  validators.authLogin || [],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }
    
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    
    if (!valid) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }
    
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: securityConfig.get('jwt.expiresIn') }
    );
    
    logger.info({ event: 'user_login', userId: user.id, username });
    
    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  })
);

// Projects (validated & rate limited)
app.post('/api/projects',
  authenticate,
  rateLimits.general,
  validators.createProject,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { name, description, type } = req.body;
    
    const projectId = `proj-${uuidv4().slice(0, 8)}`;
    
    await pool.query(
      `INSERT INTO projects (project_id, user_id, name, description, type, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [projectId, req.user.userId, name, description, type]
    );
    
    logger.info({ event: 'project_created', projectId, userId: req.user.userId });
    
    res.status(201).json({
      success: true,
      project: { project_id: projectId, name, description, type }
    });
  })
);

// AI Generation with caching and circuit breaker
app.post('/api/ai/generate',
  authenticate,
  rateLimits.ai,
  asyncHandler(async (req, res) => {
    const { provider, model, prompt, useCache = true } = req.body;
    
    // Check cache first
    if (useCache) {
      const cached = await cacheManager.getAIResult(provider, model, prompt);
      if (cached) {
        logger.info({ event: 'ai_cache_hit', provider, model });
        return res.json({ success: true, result: cached.result, fromCache: true });
      }
    }
    
    // Call AI with circuit breaker
    const result = await withCircuitBreaker(provider, async () => {
      return aiRequest(provider, async () => {
        // Actual AI call here
        return { content: 'Generated content...', tokens: 100 };
      });
    });
    
    // Cache the result
    await cacheManager.cacheAIResult(provider, model, prompt, result);
    
    logger.info({ event: 'ai_generation', provider, model, userId: req.user.userId });
    
    res.json({ success: true, result, fromCache: false });
  })
);

// WebSocket with rate limiting and auth
wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  
  ws.on('message', async (data) => {
    try {
      // Rate limit check
      const rateCheck = wsRateLimiter.checkLimit(clientId);
      if (!rateCheck.allowed) {
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Rate limit exceeded',
          retryAfter: rateCheck.resetIn
        }));
        return;
      }
      
      const msg = JSON.parse(data);
      
      // Authenticate first message
      if (msg.type === 'auth') {
        try {
          const decoded = jwt.verify(msg.payload.token, JWT_SECRET);
          clients.set(clientId, { ws, userId: decoded.userId, authenticated: true });
          ws.send(JSON.stringify({ type: 'auth:success', clientId }));
        } catch {
          ws.send(JSON.stringify({ type: 'auth:error' }));
          ws.close();
        }
        return;
      }
      
      // Check authentication for other messages
      const client = clients.get(clientId);
      if (!client?.authenticated) {
        ws.send(JSON.stringify({ type: 'error', error: 'Not authenticated' }));
        return;
      }
      
      // Handle message
      await handleWebSocketMessage(client, msg);
      
    } catch (err) {
      logger.error({ event: 'ws_error', clientId, error: err.message });
      ws.send(JSON.stringify({ type: 'error', error: 'Internal error' }));
    }
  });
  
  ws.on('close', () => {
    wsRateLimiter.removeClient(clientId);
    clients.delete(clientId);
  });
});

async function handleWebSocketMessage(client, msg) {
  // Implementation here
}

// Error handling (must be last)
app.use(errorHandler);

// Graceful shutdown setup
const handlers = createShutdownHandlers();
shutdownManager.onShutdown('HTTP Server', handlers.httpServer(server).handler);
shutdownManager.onShutdown('WebSocket Server', handlers.wsServer(wss).handler);
shutdownManager.onShutdown('Database Pool', handlers.database(pool).handler);
shutdownManager.onShutdown('Redis Client', handlers.redis(redis).handler);
shutdownManager.onShutdown('Health Checker', handlers.healthChecker(healthChecker).handler);
shutdownManager.setup();

// Start server
const PORT = process.env.PORT || 3000;

async function start() {
  await redis.connect();
  healthChecker.startPeriodicChecks();
  
  server.listen(PORT, () => {
    logger.info(`🚀 API Gateway v5.1 running on port ${PORT}`);
  });
}

start().catch(err => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = { app, server };
