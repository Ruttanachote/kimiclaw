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

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'devstudio-secret-key';

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'devstudio',
  password: process.env.DB_PASSWORD || 'devstudio123',
  database: process.env.DB_NAME || 'devstudio'
});

const redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
const redisPub = redisClient.duplicate();
const redisSub = redisClient.duplicate();

const clients = new Map();

// Auth middleware
const authenticateToken = (req, res, next) => {
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
};

async function init() {
  await redisClient.connect();
  await redisPub.connect();
  await redisSub.connect();
  
  await redisSub.subscribe('agents:broadcast', (msg) => broadcast('agent:message', JSON.parse(msg)));
  await redisSub.subscribe('agents:results', (msg) => broadcast('agent:result', JSON.parse(msg)));
  await redisSub.subscribe('agents:conversation', (msg) => broadcast('agent:conversation', JSON.parse(msg)));
  await redisSub.subscribe('factory:events', (msg) => broadcast('factory:event', JSON.parse(msg)));
  await redisSub.subscribe('supervisor:approvals', (msg) => broadcast('supervisor:approval', JSON.parse(msg)));
  
  console.log('API Gateway v4 ready with Auth + N8N');
}

function broadcast(type, data) {
  const msg = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  clients.forEach((ws) => { if (ws.readyState === 1) ws.send(msg); });
}

wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  clients.set(clientId, ws);
  
  ws.send(JSON.stringify({ type: 'connected', clientId, timestamp: new Date().toISOString() }));
  
  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data);
      await handleWSMessage(ws, msg);
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', error: err.message }));
    }
  });
  
  ws.on('close', () => clients.delete(clientId));
});

async function handleWSMessage(ws, msg) {
  const { type, payload } = msg;
  
  switch (type) {
    case 'command':
      await redisPub.publish(`agent:${payload.agentName}:commands`, JSON.stringify(payload.command));
      break;
    case 'chat':
      await redisPub.publish('agent:secretary-agent:commands', JSON.stringify({
        action: 'chat', message: payload.message, context: payload.context, task_id: uuidv4()
      }));
      break;
    case 'create-agent':
      await redisPub.publish('factory:commands', JSON.stringify({ action: 'create-agent', config: payload }));
      break;
    case 'upgrade-agent':
      await redisPub.publish('factory:commands', JSON.stringify({ 
        action: 'upgrade-agent', agentName: payload.agentName, upgrades: payload.upgrades 
      }));
      break;
    case 'delete-agent':
      await redisPub.publish('factory:commands', JSON.stringify({ 
        action: 'delete-agent', agentName: payload.agentName 
      }));
      break;
    case 'switch-project':
      broadcast('project:switched', { projectId: payload.projectId });
      break;
  }
}

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
      [username, hashedPassword]
    );
    
    res.json({ success: true, message: 'User registered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET);
    
    res.json({ success: true, token, user: { id: user.id, username: user.username } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Protected Routes
app.get('/api/agents', authenticateToken, async (req, res) => {
  try {
    const agents = await redisClient.hGetAll('agents');
    const parsed = {};
    for (const [k, v] of Object.entries(agents)) parsed[k] = JSON.parse(v);
    res.json(parsed);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/agents', authenticateToken, async (req, res) => {
  try {
    const config = req.body;
    config.name = config.name || `agent-${Date.now()}`;
    await redisPub.publish('factory:commands', JSON.stringify({ action: 'create-agent', config }));
    await pool.query('INSERT INTO agents (name, type, config, status) VALUES ($1, $2, $3, $4)',
      [config.name, config.type, JSON.stringify(config), 'creating']);
    res.json({ success: true, agent: config });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Projects
app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    const projectId = `proj-${Date.now()}`;
    await pool.query(
      'INSERT INTO projects (project_id, name, description, owner) VALUES ($1, $2, $3, $4)',
      [projectId, name, description, req.user.username]
    );
    res.json({ success: true, project: { projectId, name } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// N8N Webhook trigger
app.post('/api/n8n/trigger/:workflow', authenticateToken, async (req, res) => {
  try {
    const { workflow } = req.params;
    const n8nUrl = process.env.N8N_URL || 'http://n8n:5678';
    
    const response = await axios.post(`${n8nUrl}/webhook/${workflow}`, req.body);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Templates & Models
app.get('/api/templates', authenticateToken, async (req, res) => {
  res.json({
    templates: [
      { id: 'research', name: 'Research Agent', description: 'Web browsing and data collection' },
      { id: 'uiux', name: 'UI/UX Agent', description: 'Design with Figma integration' },
      { id: 'frontend', name: 'Frontend Agent', description: 'Vue/React development' },
      { id: 'backend', name: 'Backend Agent', description: 'API and database development' },
      { id: 'qa', name: 'QA Agent', description: 'Testing with ZAP and k6' },
      { id: 'pmba', name: 'PM/BA Agent', description: 'Reports and documentation' },
      { id: 'custom', name: 'Custom Agent', description: 'Build your own agent' }
    ]
  });
});

app.get('/api/models', authenticateToken, async (req, res) => {
  res.json({
    providers: [
      { id: 'anthropic', name: 'Anthropic Claude', models: ['claude-3-5-sonnet', 'claude-3-opus'] },
      { id: 'openai', name: 'OpenAI', models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
      { id: 'local', name: 'Local/No AI', models: ['none'] }
    ]
  });
});

// Approval Queue
app.get('/api/approvals', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM approval_queue WHERE status = $1 ORDER BY created_at DESC', ['pending']);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/approvals/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE approval_queue SET status = $1, approved_by = $2, approved_at = NOW() WHERE id = $3',
      ['approved', req.user.username, id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '4.0', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
init().then(() => {
  server.listen(PORT, () => console.log(`API Gateway v4 on port ${PORT}`));
}).catch(console.error);
