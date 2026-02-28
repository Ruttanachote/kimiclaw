const Redis = require('redis');
const Docker = require('dockerode');
const Handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class AgentFactory {
  constructor() {
    this.redis = Redis.createClient({ 
      url: process.env.REDIS_URL || 'redis://localhost:6379' 
    });
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    this.templatesDir = '/app/templates';
  }

  async initialize() {
    await this.redis.connect();
    console.log('🏭 Agent Factory ready');
    await this.listen();
  }

  async listen() {
    const subscriber = this.redis.duplicate();
    await subscriber.connect();
    
    await subscriber.subscribe('factory:commands', async (message) => {
      try {
        const cmd = JSON.parse(message);
        console.log('Factory command:', cmd);
        
        switch (cmd.action) {
          case 'create-agent':
            await this.createAgent(cmd.config);
            break;
          case 'upgrade-agent':
            await this.upgradeAgent(cmd.agentName, cmd.upgrades);
            break;
          case 'delete-agent':
            await this.deleteAgent(cmd.agentName);
            break;
          case 'list-templates':
            await this.listTemplates();
            break;
        }
      } catch (err) {
        console.error('Factory error:', err);
        await this.redis.publish('factory:errors', JSON.stringify({
          error: err.message,
          timestamp: new Date().toISOString()
        }));
      }
    });
  }

  async createAgent(config) {
    const { 
      name, 
      type = 'custom',
      modelProvider = 'local',
      modelName,
      capabilities = [],
      resources = { memory: '512m', cpu: '0.5' }
    } = config;

    console.log(`Creating agent: ${name} (${type})`);

    // Generate Dockerfile from template
    const dockerfile = await this.generateDockerfile(type, config);
    
    // Generate agent code
    const agentCode = await this.generateAgentCode(type, config);
    
    // Build and run container
    const containerName = `ai-devstudio-${name}`;
    
    // Create temp build directory
    const buildDir = `/tmp/agent-build-${uuidv4()}`;
    await fs.mkdir(buildDir, { recursive: true });
    await fs.writeFile(path.join(buildDir, 'Dockerfile'), dockerfile);
    await fs.writeFile(path.join(buildDir, 'package.json'), JSON.stringify({
      name: `agent-${name}`,
      version: '1.0.0',
      dependencies: {
        redis: '^4.6.10',
        axios: '^1.6.2'
      }
    }, null, 2));
    
    await fs.mkdir(path.join(buildDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(buildDir, 'src/index.js'), agentCode);

    // Build image
    console.log(`Building image for ${name}...`);
    const stream = await this.docker.buildImage({
      context: buildDir,
      src: ['Dockerfile', 'package.json', 'src/index.js']
    }, { t: `ai-devstudio/${name}:latest` });

    await new Promise((resolve, reject) => {
      this.docker.modem.followProgress(stream, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });

    // Run container
    console.log(`Starting container ${containerName}...`);
    const container = await this.docker.createContainer({
      name: containerName,
      Image: `ai-devstudio/${name}:latest`,
      Env: [
        `AGENT_NAME=${name}`,
        `AGENT_TYPE=${type}`,
        `REDIS_URL=redis://redis:6379`,
        `MODEL_PROVIDER=${modelProvider}`,
        `MODEL_NAME=${modelName || ''}`
      ],
      HostConfig: {
        Memory: this.parseMemory(resources.memory),
        CpuQuota: resources.cpu * 100000,
        NetworkMode: 'ai-devstudio'
      },
      NetworkingConfig: {
        EndpointsConfig: {
          'ai-devstudio': {}
        }
      }
    });

    await container.start();

    // Register in database
    await this.redis.hSet('agents', name, JSON.stringify({
      name,
      type,
      status: 'starting',
      modelProvider,
      capabilities,
      resources,
      containerId: container.id,
      createdAt: new Date().toISOString()
    }));

    // Notify
    await this.redis.publish('factory:events', JSON.stringify({
      type: 'agent-created',
      agent: { name, type, status: 'running' }
    }));

    console.log(`✅ Agent ${name} created and running`);

    // Cleanup
    await fs.rm(buildDir, { recursive: true });
  }

  async generateDockerfile(type, config) {
    const templatePath = path.join(this.templatesDir, 'Dockerfile.hbs');
    
    try {
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const template = Handlebars.compile(templateContent);
      return template({ type, config });
    } catch {
      // Default Dockerfile
      return `FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY src/ ./src/
CMD ["node", "src/index.js"]`;
    }
  }

  async generateAgentCode(type, config) {
    const templatePath = path.join(this.templatesDir, `agent-${type}.hbs`);
    
    try {
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const template = Handlebars.compile(templateContent);
      return template({ ...config, name: config.name });
    } catch {
      // Default agent code
      return `const redis = require('redis');

class Agent {
  constructor() {
    this.name = process.env.AGENT_NAME;
    this.redis = redis.createClient({ url: process.env.REDIS_URL });
  }
  
  async start() {
    await this.redis.connect();
    console.log(\`Agent \${this.name} ready\`);
    
    // Announce presence
    await this.redis.hSet('agents', this.name, JSON.stringify({
      name: this.name,
      status: 'idle',
      capabilities: ${JSON.stringify(config.capabilities || [])}
    }));
  }
}

new Agent().start();`;
    }
  }

  async upgradeAgent(agentName, upgrades) {
    console.log(`Upgrading ${agentName}:`, upgrades);
    
    // Get current agent info
    const agentInfo = await this.redis.hGet('agents', agentName);
    if (!agentInfo) throw new Error(`Agent ${agentName} not found`);
    
    const agent = JSON.parse(agentInfo);
    
    // Apply upgrades
    if (upgrades.capabilities) {
      agent.capabilities = [...new Set([...agent.capabilities, ...upgrades.capabilities])];
    }
    
    if (upgrades.resources) {
      agent.resources = { ...agent.resources, ...upgrades.resources };
    }
    
    // Update container if needed
    if (upgrades.restart) {
      const container = this.docker.getContainer(agent.containerId);
      await container.restart();
    }
    
    // Save
    agent.updatedAt = new Date().toISOString();
    await this.redis.hSet('agents', agentName, JSON.stringify(agent));
    
    await this.redis.publish('factory:events', JSON.stringify({
      type: 'agent-upgraded',
      agent: { name: agentName, upgrades }
    }));
    
    console.log(`✅ Agent ${agentName} upgraded`);
  }

  async deleteAgent(agentName) {
    console.log(`Deleting agent: ${agentName}`);
    
    const agentInfo = await this.redis.hGet('agents', agentName);
    if (!agentInfo) throw new Error(`Agent ${agentName} not found`);
    
    const agent = JSON.parse(agentInfo);
    
    // Stop and remove container
    if (agent.containerId) {
      const container = this.docker.getContainer(agent.containerId);
      try {
        await container.stop();
        await container.remove();
      } catch (err) {
        console.warn('Container may already be removed:', err.message);
      }
    }
    
    // Remove from registry
    await this.redis.hDel('agents', agentName);
    
    await this.redis.publish('factory:events', JSON.stringify({
      type: 'agent-deleted',
      agent: { name: agentName }
    }));
    
    console.log(`✅ Agent ${agentName} deleted`);
  }

  async listTemplates() {
    try {
      const files = await fs.readdir(this.templatesDir);
      const templates = files
        .filter(f => f.endsWith('.hbs'))
        .map(f => f.replace('.hbs', ''));
      
      await this.redis.publish('factory:templates', JSON.stringify({
        templates,
        timestamp: new Date().toISOString()
      }));
    } catch (err) {
      console.error('Failed to list templates:', err);
    }
  }

  parseMemory(memString) {
    const match = memString.match(/^(\d+)([mg])$/i);
    if (!match) return 512 * 1024 * 1024; // default 512MB
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    return unit === 'g' ? value * 1024 * 1024 * 1024 : value * 1024 * 1024;
  }
}

// Start factory
const factory = new AgentFactory();
factory.initialize().catch(console.error);
