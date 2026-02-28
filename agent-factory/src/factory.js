const express = require('express');
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');

const execPromise = util.promisify(exec);
const app = express();
app.use(express.json());

const agents = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'agent-factory' });
});

// Create new agent
app.post('/create', async (req, res) => {
  const { name, type, config } = req.body;
  
  try {
    const agentId = `agent-${Date.now()}`;
    const agentDir = `/app/agents/${agentId}`;
    
    // Create agent directory
    await fs.mkdir(agentDir, { recursive: true });
    
    // Generate agent files
    await generateAgentFiles(agentDir, name, type, config);
    
    // Build Docker image
    await execPromise(`docker build -t ${agentId} ${agentDir}`);
    
    // Run container
    await execPromise(`docker run -d --name ${agentId} -p 0:3000 ${agentId}`);
    
    agents.set(agentId, {
      id: agentId,
      name,
      type,
      status: 'running',
      createdAt: new Date().toISOString()
    });
    
    res.json({ 
      success: true, 
      agent: {
        id: agentId,
        name,
        type,
        status: 'running'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

async function generateAgentFiles(dir, name, type, config) {
  // package.json
  const packageJson = {
    name: name.toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    dependencies: {
      express: '^4.18.2'
    }
  };
  
  await fs.writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  // Dockerfile
  const dockerfile = `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]`;
  
  await fs.writeFile(path.join(dir, 'Dockerfile'), dockerfile);
  
  // index.js
  const indexJs = `const express = require('express');
const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', agent: '${name}', type: '${type}' });
});

app.listen(3000, () => {
  console.log('${name} agent running on port 3000');
});`;
  
  await fs.writeFile(path.join(dir, 'index.js'), indexJs);
}

// List all created agents
app.get('/agents', (req, res) => {
  const agentList = Array.from(agents.values());
  res.json({ agents: agentList });
});

// Stop agent
app.post('/stop/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    await execPromise(`docker stop ${id}`);
    await execPromise(`docker rm ${id}`);
    
    const agent = agents.get(id);
    if (agent) {
      agent.status = 'stopped';
    }
    
    res.json({ success: true, message: `${id} stopped` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🏭 Agent Factory running on port ${PORT}`);
});
