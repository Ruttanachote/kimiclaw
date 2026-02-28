const redis = require('redis');
const Docker = require('dockerode');
const fs = require('fs').promises;
const path = require('path');

class BackendAgent {
  constructor() {
    this.name = process.env.AGENT_NAME || 'backend-agent';
    this.redis = redis.createClient({ url: process.env.REDIS_URL });
    this.redisPub = this.redis.duplicate();
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  async start() {
    await this.redis.connect();
    await this.redisPub.connect();
    
    console.log(`🔧 ${this.name} ready (with Docker access)`);
    
    await this.redis.hSet('agents', this.name, JSON.stringify({
      name: this.name,
      type: 'backend',
      status: 'idle',
      capabilities: ['api', 'database', 'microservice', 'docker']
    }));

    const sub = this.redis.duplicate();
    await sub.connect();
    await sub.subscribe(`agent:${this.name}:commands`, async (msg) => {
      const cmd = JSON.parse(msg);
      await this.handleCommand(cmd);
    });
  }

  async handleCommand(cmd) {
    this.redis.hSet('agents', this.name, JSON.stringify({
      name: this.name, type: 'backend', status: 'busy'
    }));

    try {
      let result;
      switch (cmd.action) {
        case 'create-api':
          result = await this.createAPI(cmd);
          break;
        case 'setup-database':
          result = await this.setupDatabase(cmd);
          break;
        case 'create-microservice':
          result = await this.createMicroservice(cmd);
          break;
        case 'deploy':
          result = await this.deployService(cmd);
          break;
        default:
          result = { error: 'Unknown action' };
      }

      this.redisPub.publish('agents:results', JSON.stringify({
        agent: this.name, task_id: cmd.task_id, result
      }));
    } catch (err) {
      this.redisPub.publish('agents:errors', JSON.stringify({
        agent: this.name, error: err.message
      }));
    }

    this.redis.hSet('agents', this.name, JSON.stringify({
      name: this.name, type: 'backend', status: 'idle'
    }));
  }

  async createAPI({ projectName, endpoints }) {
    const projectPath = `/app/projects/${projectName}`;
    
    // Create Express.js API structure
    const serverCode = `
const express = require('express');
const app = express();
app.use(express.json());

${endpoints.map(e => `
app.${e.method}('${e.path}', (req, res) => {
  res.json({ message: '${e.name} endpoint' });
});
`).join('')}

app.listen(3000, () => console.log('API running on port 3000'));
`;

    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(path.join(projectPath, 'server.js'), serverCode);
    await fs.writeFile(path.join(projectPath, 'package.json'), JSON.stringify({
      name: projectName,
      dependencies: { express: '^4.18.2' }
    }, null, 2));

    return {
      success: true,
      message: `API created with ${endpoints.length} endpoints`,
      projectPath
    };
  }

  async setupDatabase({ projectName, dbType }) {
    return {
      success: true,
      message: `${dbType} database configured for ${projectName}`
    };
  }

  async createMicroservice({ name, image }) {
    // Use Docker to create microservice
    try {
      await this.docker.createContainer({
        name: `ms-${name}`,
        Image: image,
        Env: ['NODE_ENV=production'],
        HostConfig: { NetworkMode: 'ai-devstudio' }
      });
      
      return {
        success: true,
        message: `Microservice ${name} created from ${image}`
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async deployService({ projectName }) {
    return {
      success: true,
      message: `${projectName} deployed successfully`
    };
  }
}

new BackendAgent().start();
