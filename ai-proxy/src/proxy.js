const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const redis = require('redis');
const { Pool } = require('pg');
const CryptoJS = require('crypto-js');
const axios = require('axios');
const { RateLimiterRedis } = require('rate-limiter-flexible');

const app = express();
app.use(cors());
app.use(express.json());

// Session for Google Auth
app.use(session({
  secret: process.env.JWT_SECRET || 'secret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Database
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Redis
const redisClient = redis.createClient({ url: process.env.REDIS_URL });
const redisPub = redisClient.duplicate();

// Encryption
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-key';

// Rate limiters per account
const rateLimiters = new Map();

// Provider configs
const PROVIDERS = {
  anthropic: {
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
    rateLimit: 100, // requests per minute
    tokenLimit: 100000 // tokens per minute
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    rateLimit: 60,
    tokenLimit: 60000
  }
};

class AIProxy {
  constructor() {
    this.activeAccounts = new Map(); // userId -> account
    this.accountPool = new Map(); // provider -> accounts[]
  }

  async initialize() {
    await redisClient.connect();
    await redisPub.connect();
    
    await this.loadAccounts();
    console.log('🤖 AI Proxy initialized');
    
    // Start monitoring loop
    setInterval(() => this.monitorAccounts(), 60000);
  }

  // Encrypt API key
  encrypt(text) {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
  }

  // Decrypt API key
  decrypt(ciphertext) {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  // Load all accounts from DB
  async loadAccounts() {
    const result = await pool.query(
      'SELECT * FROM ai_accounts WHERE is_active = true'
    );
    
    for (const account of result.rows) {
      const provider = account.provider;
      if (!this.accountPool.has(provider)) {
        this.accountPool.set(provider, []);
      }
      
      this.accountPool.get(provider).push({
        id: account.id,
        userId: account.user_id,
        provider: account.provider,
        apiKey: this.decrypt(account.encrypted_key),
        usageToday: account.usage_today || 0,
        limitDaily: account.daily_limit || 1000,
        isActive: account.is_active
      });
    }
    
    console.log(`Loaded ${result.rowCount} AI accounts`);
  }

  // Get best available account for provider
  async getBestAccount(provider, userId) {
    const accounts = this.accountPool.get(provider) || [];
    
    // Sort by usage (least used first)
    const sorted = accounts
      .filter(a => a.isActive && a.usageToday < a.limitDaily)
      .sort((a, b) => a.usageToday - b.usageToday);
    
    if (sorted.length === 0) {
      throw new Error(`No available accounts for ${provider}`);
    }
    
    // Check rate limit
    for (const account of sorted) {
      const limiterKey = `${provider}:${account.id}`;
      
      if (!rateLimiters.has(limiterKey)) {
        rateLimiters.set(limiterKey, new RateLimiterRedis({
          storeClient: redisClient,
          keyPrefix: limiterKey,
          points: PROVIDERS[provider].rateLimit,
          duration: 60
        }));
      }
      
      const limiter = rateLimiters.get(limiterKey);
      
      try {
        await limiter.consume(1);
        return account;
      } catch {
        // Rate limited, try next account
        continue;
      }
    }
    
    throw new Error(`All accounts rate limited for ${provider}`);
  }

  // Proxy request to AI provider
  async proxyRequest(provider, requestBody, userId) {
    const account = await this.getBestAccount(provider, userId);
    const config = PROVIDERS[provider];
    
    try {
      let response;
      
      if (provider === 'anthropic') {
        response = await axios.post(
          `${config.baseUrl}/v1/messages`,
          requestBody,
          {
            headers: {
              'x-api-key': account.apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json'
            }
          }
        );
      } else if (provider === 'openai') {
        response = await axios.post(
          `${config.baseUrl}/v1/chat/completions`,
          requestBody,
          {
            headers: {
              'Authorization': `Bearer ${account.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }
      
      // Update usage
      account.usageToday++;
      await pool.query(
        'UPDATE ai_accounts SET usage_today = usage_today + 1, last_used = NOW() WHERE id = $1',
        [account.id]
      );
      
      return {
        success: true,
        data: response.data,
        account: account.id,
        remaining: account.limitDaily - account.usageToday
      };
      
    } catch (error) {
      // If failed, mark account and retry with another
      console.error(`Account ${account.id} failed:`, error.message);
      
      // Try next account
      return this.proxyRequest(provider, requestBody, userId);
    }
  }

  // Monitor and rotate accounts
  async monitorAccounts() {
    console.log('🔍 Monitoring AI accounts...');
    
    for (const [provider, accounts] of this.accountPool) {
      for (const account of accounts) {
        // Reset daily usage at midnight
        const now = new Date();
        if (now.getHours() === 0 && now.getMinutes() < 5) {
          account.usageToday = 0;
          await pool.query(
            'UPDATE ai_accounts SET usage_today = 0 WHERE id = $1',
            [account.id]
          );
        }
        
        // Check if account is healthy
        if (account.usageToday >= account.limitDaily * 0.9) {
          console.warn(`⚠️ Account ${account.id} near limit`);
        }
      }
    }
  }

  // Add new account
  async addAccount(userId, provider, apiKey, dailyLimit = 1000) {
    const encrypted = this.encrypt(apiKey);
    
    const result = await pool.query(
      `INSERT INTO ai_accounts (user_id, provider, encrypted_key, daily_limit)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, provider, encrypted, dailyLimit]
    );
    
    // Reload accounts
    await this.loadAccounts();
    
    return { id: result.rows[0].id, provider, dailyLimit };
  }
}

// Initialize
const proxy = new AIProxy();
proxy.initialize().catch(console.error);

// Google OAuth setup
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists
    let result = await pool.query(
      'SELECT * FROM users WHERE google_id = $1',
      [profile.id]
    );
    
    let user;
    
    if (result.rows.length === 0) {
      // Create new user
      result = await pool.query(
        `INSERT INTO users (username, email, google_id, auth_provider)
         VALUES ($1, $2, $3, 'google') RETURNING *`,
        [profile.displayName, profile.emails[0].value, profile.id]
      );
      user = result.rows[0];
      
      // Create default AI account for demo
      await proxy.addAccount(user.id, 'anthropic', process.env.DEFAULT_ANTHROPIC_KEY || '', 100);
    } else {
      user = result.rows[0];
    }
    
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  done(null, result.rows[0]);
});

// Routes

// Google Auth
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/dashboard');
  });

// Proxy endpoint
app.post('/proxy/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user?.id || 'anonymous';
    
    if (!PROVIDERS[provider]) {
      return res.status(400).json({ error: 'Unknown provider' });
    }
    
    const result = await proxy.proxyRequest(provider, req.body, userId);
    res.json(result);
    
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      code: 'PROXY_ERROR'
    });
  }
});

// Get user accounts
app.get('/accounts', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const result = await pool.query(
      'SELECT id, provider, usage_today, daily_limit, is_active FROM ai_accounts WHERE user_id = $1',
      [userId]
    );
    
    res.json({ accounts: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add account
app.post('/accounts', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { provider, apiKey, dailyLimit } = req.body;
    
    const account = await proxy.addAccount(userId, provider, apiKey, dailyLimit);
    res.json({ success: true, account });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'ai-proxy',
    providers: Array.from(proxy.accountPool.keys()),
    accounts: Array.from(proxy.accountPool.values()).reduce((sum, accs) => sum + accs.length, 0)
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🔌 AI Proxy running on port ${PORT}`);
});
