const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const AGENTS = {
  uiux: process.env.UIUX_AGENT_URL || 'http://uiux-agent:3000',
  frontend: process.env.FRONTEND_AGENT_URL || 'http://frontend-agent:3000',
  backend: process.env.BACKEND_AGENT_URL || 'http://backend-agent:3000',
  qa: process.env.QA_AGENT_URL || 'http://qa-agent:3000'
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', agent: 'secretary-agent' });
});

// Process user request
app.post('/process', async (req, res) => {
  const { message, projectId } = req.body;
  
  try {
    // Parse intent
    const intent = parseIntent(message);
    
    // Delegate to appropriate agent
    let result;
    switch(intent.type) {
      case 'design':
        result = await delegateToAgent('uiux', '/wireframe', { 
          title: intent.projectName,
          type: 'landing'
        });
        break;
      case 'frontend':
        result = await delegateToAgent('frontend', '/generate', {
          name: 'HomePage',
          type: 'page'
        });
        break;
      case 'backend':
        result = await delegateToAgent('backend', '/generate-api', {
          resource: 'users',
          methods: ['get', 'post']
        });
        break;
      default:
        result = { message: 'เข้าใจค่ะ! กำลังดำเนินการ...' };
    }
    
    res.json({ 
      success: true, 
      response: result.message || 'ดำเนินการเสร็จสิ้น',
      intent: intent.type
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function parseIntent(message) {
  const msg = message.toLowerCase();
  
  if (msg.includes('ออกแบบ') || msg.includes('design')) {
    return { type: 'design', projectName: extractProjectName(msg) };
  }
  if (msg.includes('frontend') || msg.includes('หน้าบ้าน')) {
    return { type: 'frontend' };
  }
  if (msg.includes('backend') || msg.includes('หลังบ้าน')) {
    return { type: 'backend' };
  }
  if (msg.includes('เทส') || msg.includes('test')) {
    return { type: 'test' };
  }
  
  return { type: 'general' };
}

function extractProjectName(message) {
  const match = message.match(/(?:สร้าง|ออกแบบ|ทำ)\s*(.+?)(?:\s+ให้|$)/);
  return match ? match[1].trim() : 'Untitled Project';
}

async function delegateToAgent(agent, endpoint, data) {
  try {
    const url = `${AGENTS[agent]}${endpoint}`;
    const response = await axios.post(url, data, { timeout: 30000 });
    return response.data;
  } catch (err) {
    return { message: `${agent} agent ไม่พร้อมใช้งาน` };
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`💬 Secretary Agent running on port ${PORT}`);
});
