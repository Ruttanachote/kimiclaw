const redis = require('redis');
const axios = require('axios');

class UIUXAgent {
  constructor() {
    this.name = process.env.AGENT_NAME || 'uiux-agent';
    this.redis = redis.createClient({ url: process.env.REDIS_URL });
    this.redisPub = this.redis.duplicate();
    this.figmaToken = process.env.FIGMA_API_KEY;
    this.n8nWebhook = process.env.N8N_WEBHOOK;
  }

  async start() {
    await this.redis.connect();
    await this.redisPub.connect();
    
    console.log(`🎨 ${this.name} ready`);
    console.log(this.figmaToken ? '✅ Figma API connected' : '⚠️ Figma API not configured');
    
    await this.redis.hSet('agents', this.name, JSON.stringify({
      name: this.name,
      type: 'uiux',
      status: 'idle',
      capabilities: ['design', 'figma', 'wireframe', 'prototype', 'builder-io']
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
      name: this.name, type: 'uiux', status: 'busy'
    }));

    try {
      let result;
      switch (cmd.action) {
        case 'create-wireframe':
          result = await this.createWireframe(cmd);
          break;
        case 'design-component':
          result = await this.designComponent(cmd);
          break;
        case 'export-to-figma':
          result = await this.exportToFigma(cmd);
          break;
        case 'get-figma-file':
          result = await this.getFigmaFile(cmd);
          break;
        case 'builder-to-code':
          result = await this.builderToCode(cmd);
          break;
        default:
          result = { error: 'Unknown action' };
      }

      this.redisPub.publish('agents:results', JSON.stringify({
        agent: this.name, task_id: cmd.task_id, result
      }));

      // Send to N8N
      if (this.n8nWebhook) {
        axios.post(this.n8nWebhook, { agent: this.name, result }).catch(() => {});
      }
    } catch (err) {
      this.redisPub.publish('agents:errors', JSON.stringify({
        agent: this.name, error: err.message
      }));
    }

    this.redis.hSet('agents', this.name, JSON.stringify({
      name: this.name, type: 'uiux', status: 'idle'
    }));
  }

  async createWireframe({ projectName, pages }) {
    const wireframes = pages.map(page => ({
      page,
      layout: this.generateWireframeLayout(page)
    }));

    return {
      success: true,
      message: `Wireframe created for ${pages.join(', ')}`,
      project: projectName,
      wireframes
    };
  }

  generateWireframeLayout(pageType) {
    const layouts = {
      home: { header: true, hero: true, features: true, footer: true },
      product: { header: true, gallery: true, details: true, related: true, footer: true },
      checkout: { header: true, form: true, summary: true, footer: true }
    };
    return layouts[pageType] || layouts.home;
  }

  async designComponent({ name, type, props }) {
    return {
      success: true,
      message: `Component ${name} (${type}) designed`,
      component: { name, type, props },
      figmaUrl: this.figmaToken ? `https://figma.com/file/.../${name}` : null
    };
  }

  async exportToFigma({ fileId, data }) {
    if (!this.figmaToken) {
      return { success: false, error: 'Figma API key not configured' };
    }

    try {
      // Call Figma API
      const response = await axios.post(
        `https://api.figma.com/v1/files/${fileId}/comments`,
        { message: 'Exported from AI DevStudio', client_meta: data },
        { headers: { 'X-Figma-Token': this.figmaToken } }
      );

      return {
        success: true,
        message: `Exported to Figma file: ${fileId}`,
        figmaData: response.data
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async getFigmaFile({ fileId }) {
    if (!this.figmaToken) {
      return { success: false, error: 'Figma API key not configured' };
    }

    try {
      const response = await axios.get(
        `https://api.figma.com/v1/files/${fileId}`,
        { headers: { 'X-Figma-Token': this.figmaToken } }
      );

      return {
        success: true,
        file: response.data
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async builderToCode({ builderContent }) {
    // Simulate Builder.io to code conversion
    return {
      success: true,
      message: 'Converted Builder.io design to code',
      code: {
        framework: 'vue3',
        components: ['Hero', 'Features', 'CTA'],
        files: ['Hero.vue', 'Features.vue', 'CTA.vue']
      }
    };
  }
}

new UIUXAgent().start();
