const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const redis = require('redis');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const JWT_SECRET = process.env.JWT_SECRET || 'devstudio-secret-key';

app.use(cors());
app.use(express.json());

// Database
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'devstudio',
  password: process.env.DB_PASSWORD || 'devstudio123',
  database: process.env.DB_NAME || 'devstudio'
});

// Redis
const redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
const redisPub = redisClient.duplicate();

// Connected WebSocket clients
const clients = new Map();

// Initialize
async function init() {
  await redisClient.connect();
  await redisPub.connect();
  
  // Subscribe to channels
  await redisSub.subscribe('usage:updates', handleUsageUpdate);
  await redisSub.subscribe('agents:broadcast', (msg) => broadcast('agent:message', JSON.parse(msg)));
  await redisSub.subscribe('agents:results', (msg) => broadcast('agent:result', JSON.parse(msg)));
  
  console.log('API Gateway v5 ready with Stripe + WebSocket');
}

// Broadcast to all connected clients
function broadcast(type, data) {
  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  clients.forEach((client) => {
    if (client.ws.readyState === 1) {
      client.ws.send(message);
    }
  });
}

// Handle usage updates from AI Proxy
async function handleUsageUpdate(message) {
  const data = JSON.parse(message);
  broadcast('usage:update', data);
}

// WebSocket handling
wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  const client = { ws, userId: null, subscriptions: [] };
  clients.set(clientId, client);
  
  ws.send(JSON.stringify({ type: 'connected', clientId }));
  
  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data);
      await handleWSMessage(client, msg);
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', error: err.message }));
    }
  });
  
  ws.on('close', () => clients.delete(clientId));
});

async function handleWSMessage(client, msg) {
  const { type, payload } = msg;
  
  switch (type) {
    case 'auth':
      // Authenticate WebSocket connection
      try {
        const decoded = jwt.verify(payload.token, JWT_SECRET);
        client.userId = decoded.userId;
        client.ws.send(JSON.stringify({ type: 'auth:success', userId: decoded.userId }));
      } catch {
        client.ws.send(JSON.stringify({ type: 'auth:error' }));
      }
      break;
      
    case 'subscribe':
      // Subscribe to real-time updates
      client.subscriptions.push(payload.channel);
      break;
      
    case 'command':
      // Forward command to agent
      await redisPub.publish(`agent:${payload.agentName}:commands`, JSON.stringify(payload.command));
      break;
  }
}

// ========== STRIPE PAYMENT ROUTES ==========

// Create checkout session
app.post('/api/billing/checkout', authenticateToken, async (req, res) => {
  try {
    const { planId, billingCycle } = req.body;
    const userId = req.user.userId;
    
    // Get plan details
    const planResult = await pool.query('SELECT * FROM subscription_plans WHERE plan_id = $1', [planId]);
    const plan = planResult.rows[0];
    
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    // Get or create Stripe customer
    let customerResult = await pool.query('SELECT stripe_customer_id FROM users WHERE id = $1', [userId]);
    let customerId = customerResult.rows[0]?.stripe_customer_id;
    
    if (!customerId) {
      const userResult = await pool.query('SELECT email, username FROM users WHERE id = $1', [userId]);
      const user = userResult.rows[0];
      
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.username
      });
      
      customerId = customer.id;
      await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, userId]);
    }
    
    // Create checkout session
    const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: plan.name,
            description: plan.description
          },
          unit_amount: price,
          recurring: {
            interval: billingCycle === 'yearly' ? 'year' : 'month'
          }
        },
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
      metadata: {
        userId: userId.toString(),
        planId: planId
      }
    });
    
    res.json({ sessionId: session.id, url: session.url });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stripe webhook
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle events
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      
      // Activate subscription
      await pool.query(
        `INSERT INTO user_subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', NOW(), NOW() + INTERVAL '1 month')
         ON CONFLICT (user_id) DO UPDATE SET
         plan_id = $2, status = 'active', current_period_start = NOW(), current_period_end = NOW() + INTERVAL '1 month'`,
        [session.metadata.userId, session.metadata.planId]
      );
      
      // Log billing
      await pool.query(
        'INSERT INTO billing_history (user_id, amount_cents, status, payment_provider, payment_id, description) VALUES ($1, $2, $3, $4, $5, $6)',
        [session.metadata.userId, session.amount_total, 'completed', 'stripe', session.payment_intent, `Subscription: ${session.metadata.planId}`]
      );
      
      // Notify user
      broadcast('billing:success', {
        userId: session.metadata.userId,
        planId: session.metadata.planId
      });
      break;
      
    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      // Handle failed payment
      await pool.query(
        "UPDATE user_subscriptions SET status = 'past_due' WHERE user_id = $1",
        [failedInvoice.metadata.userId]
      );
      break;
  }
  
  res.json({ received: true });
});

// Get billing history
app.get('/api/billing/history', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM billing_history WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json({ history: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel subscription
app.post('/api/billing/cancel', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE user_subscriptions SET cancel_at_period_end = true WHERE user_id = $1',
      [req.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== USAGE ROUTES ==========

// Get real-time usage
app.get('/api/usage', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's usage
    const usageResult = await pool.query(
      'SELECT * FROM usage_tracking WHERE user_id = $1 AND date = $2',
      [req.user.userId, today]
    );
    
    // Get subscription limits
    const subResult = await pool.query(
      `SELECT s.*, p.limits FROM user_subscriptions s
       JOIN subscription_plans p ON s.plan_id = p.plan_id
       WHERE s.user_id = $1`,
      [req.user.userId]
    );
    
    res.json({
      today: usageResult.rows[0] || { requests_count: 0, tokens_used: 0 },
      subscription: subResult.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== AI PROXY ROUTES ==========

// Get all providers
app.get('/api/providers', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, provider, is_active, usage_today, daily_limit FROM ai_accounts WHERE user_id = $1 OR is_shared = true',
      [req.user.userId]
    );
    res.json({ providers: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add provider
app.post('/api/providers', authenticateToken, async (req, res) => {
  try {
    const { provider, apiKey, dailyLimit } = req.body;
    
    // Encrypt API key
    const encrypted = require('crypto-js').AES.encrypt(apiKey, process.env.ENCRYPTION_KEY).toString();
    
    const result = await pool.query(
      'INSERT INTO ai_accounts (user_id, provider, encrypted_key, daily_limit) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.user.userId, provider, encrypted, dailyLimit || 1000]
    );
    
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test provider connection
app.post('/api/providers/:id/test', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get provider details
    const result = await pool.query(
      'SELECT * FROM ai_accounts WHERE id = $1 AND (user_id = $2 OR is_shared = true)',
      [id, req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    
    const account = result.rows[0];
    
    // Test connection based on provider
    // This would call the AI Proxy service
    const proxyUrl = process.env.AI_PROXY_URL || 'http://ai-proxy:3001';
    
    const testResult = await axios.post(`${proxyUrl}/test`, {
      provider: account.provider,
      encryptedKey: account.encrypted_key
    });
    
    res.json(testResult.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== MIDDLEWARE ==========

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '5.0',
    features: ['stripe', 'websocket', 'ai-proxy'],
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
init().then(() => {
  server.listen(PORT, () => console.log(`API Gateway v5 on port ${PORT}`));
}).catch(console.error);
