const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class AgentMemorySystem {
  constructor(basePath = './agent-memories') {
    this.basePath = basePath;
    this.ensureDirectory();
  }

  async ensureDirectory() {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (err) {
      console.error('Failed to create memories directory:', err);
    }
  }

  // Get memory file path for an agent
  getMemoryPath(agentName) {
    return path.join(this.basePath, `${agentName}.md`);
  }

  // Read agent's memory
  async readMemory(agentName) {
    try {
      const filePath = this.getMemoryPath(agentName);
      const content = await fs.readFile(filePath, 'utf-8');
      return this.parseMemory(content);
    } catch (err) {
      if (err.code === 'ENOENT') {
        // File doesn't exist, return empty memory
        return this.createEmptyMemory(agentName);
      }
      throw err;
    }
  }

  // Write/update agent's memory
  async writeMemory(agentName, updates) {
    const filePath = this.getMemoryPath(agentName);
    
    // Read existing or create new
    let memory;
    try {
      const existing = await fs.readFile(filePath, 'utf-8');
      memory = this.parseMemory(existing);
    } catch {
      memory = this.createEmptyMemory(agentName);
    }

    // Apply updates
    memory = this.mergeMemory(memory, updates);
    memory.metadata.lastUpdated = new Date().toISOString();
    memory.metadata.version += 1;

    // Write back
    const content = this.serializeMemory(memory);
    await fs.writeFile(filePath, content, 'utf-8');

    return memory;
  }

  // Append to agent's memory
  async appendMemory(agentName, section, content) {
    const memory = await this.readMemory(agentName);
    
    if (!memory.sections[section]) {
      memory.sections[section] = [];
    }

    memory.sections[section].push({
      id: uuidv4(),
      content,
      timestamp: new Date().toISOString(),
      tags: []
    });

    return this.writeMemory(agentName, memory);
  }

  // Search in agent's memory
  async searchMemory(agentName, query) {
    const memory = await this.readMemory(agentName);
    const results = [];

    for (const [section, items] of Object.entries(memory.sections)) {
      for (const item of items) {
        if (item.content.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            section,
            ...item
          });
        }
      }
    }

    return results;
  }

  // Parse markdown memory file
  parseMemory(content) {
    const lines = content.split('\n');
    const memory = {
      metadata: {},
      sections: {}
    };

    let currentSection = null;
    let currentContent = [];

    for (const line of lines) {
      // Parse metadata (YAML frontmatter)
      if (line.startsWith('---')) {
        continue;
      }

      if (line.startsWith('agent:')) {
        memory.metadata.agent = line.split(':')[1].trim();
      } else if (line.startsWith('created:')) {
        memory.metadata.created = line.split(':')[1].trim();
      } else if (line.startsWith('updated:')) {
        memory.metadata.lastUpdated = line.split(':')[1].trim();
      } else if (line.startsWith('version:')) {
        memory.metadata.version = parseInt(line.split(':')[1].trim());
      }

      // Parse sections
      else if (line.startsWith('## ')) {
        if (currentSection) {
          memory.sections[currentSection] = this.parseSection(currentContent);
        }
        currentSection = line.replace('## ', '').trim();
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    // Don't forget last section
    if (currentSection) {
      memory.sections[currentSection] = this.parseSection(currentContent);
    }

    return memory;
  }

  parseSection(lines) {
    const items = [];
    let currentItem = null;

    for (const line of lines) {
      if (line.startsWith('- ') || line.startsWith('* ')) {
        if (currentItem) {
          items.push(currentItem);
        }
        currentItem = {
          id: uuidv4(),
          content: line.replace(/^[-*] /, '').trim(),
          timestamp: new Date().toISOString(),
          tags: []
        };
      } else if (currentItem && line.trim()) {
        currentItem.content += '\n' + line.trim();
      }
    }

    if (currentItem) {
      items.push(currentItem);
    }

    return items;
  }

  // Serialize memory to markdown
  serializeMemory(memory) {
    const lines = [
      '---',
      `agent: ${memory.metadata.agent}`,
      `created: ${memory.metadata.created}`,
      `updated: ${memory.metadata.lastUpdated}`,
      `version: ${memory.metadata.version}`,
      '---',
      ''
    ];

    for (const [section, items] of Object.entries(memory.sections)) {
      lines.push(`## ${section}`);
      lines.push('');

      for (const item of items) {
        lines.push(`- ${item.content}`);
        if (item.tags.length > 0) {
          lines.push(`  Tags: ${item.tags.join(', ')}`);
        }
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  createEmptyMemory(agentName) {
    return {
      metadata: {
        agent: agentName,
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        version: 1
      },
      sections: {
        'Learned Patterns': [],
        'Common Mistakes': [],
        'User Preferences': [],
        'Project Context': [],
        'Improvements': []
      }
    };
  }

  mergeMemory(existing, updates) {
    return {
      metadata: { ...existing.metadata, ...updates.metadata },
      sections: { ...existing.sections, ...updates.sections }
    };
  }

  // List all agent memories
  async listMemories() {
    try {
      const files = await fs.readdir(this.basePath);
      return files
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace('.md', ''));
    } catch {
      return [];
    }
  }

  // Delete agent memory
  async deleteMemory(agentName) {
    const filePath = this.getMemoryPath(agentName);
    try {
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = AgentMemorySystem;
