const express = require('express');
const app = express();
app.use(express.json());

const agents = new Map();
const tasks = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', agent: 'supervisor-agent' });
});

// Register agent
app.post('/register', (req, res) => {
  const { name, url, capabilities } = req.body;
  
  agents.set(name, {
    name,
    url,
    capabilities,
    status: 'online',
    registeredAt: new Date().toISOString()
  });
  
  res.json({ success: true, message: `${name} registered` });
});

// Get all agents status
app.get('/agents', (req, res) => {
  const agentList = Array.from(agents.values());
  res.json({ agents: agentList });
});

// Create task
app.post('/task', (req, res) => {
  const { type, data, assignedTo } = req.body;
  
  const task = {
    id: `task-${Date.now()}`,
    type,
    data,
    assignedTo,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  tasks.set(task.id, task);
  
  res.json({ success: true, task });
});

// Get task status
app.get('/task/:id', (req, res) => {
  const task = tasks.get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json({ task });
});

// Approve task completion
app.post('/approve/:id', (req, res) => {
  const { approved, notes } = req.body;
  const task = tasks.get(req.params.id);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  task.status = approved ? 'approved' : 'rejected';
  task.approvalNotes = notes;
  task.approvedAt = new Date().toISOString();
  
  res.json({ success: true, task });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`👁️ Supervisor Agent running on port ${PORT}`);
});
