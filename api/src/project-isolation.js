// Project Isolation System
// แยก Memory, Context, History ตามโปรเจก ไม่ให้ปนกัน

const { v4: uuidv4 } = require('uuid');

class ProjectIsolationManager {
  constructor(redis, db) {
    this.redis = redis;
    this.db = db;
    this.activeProjects = new Map(); // userId -> activeProjectId
  }

  // สร้างโปรเจกใหม่ — แยกสะอาด
  async createProject(userId, projectConfig) {
    const projectId = `proj-${uuidv4().slice(0, 8)}`;
    
    const project = {
      id: projectId,
      userId,
      name: projectConfig.name,
      description: projectConfig.description,
      type: projectConfig.type || 'web-app',
      status: 'active',
      createdAt: new Date().toISOString(),
      settings: {
        // การตั้งค่าเฉพาะโปรเจก
        aiTone: projectConfig.aiTone || 'professional',
        techStack: projectConfig.techStack || {},
        preferredProviders: projectConfig.providers || ['anthropic'],
        autoDeploy: false
      }
    };

    // บันทึกลง Database
    await this.db.query(
      `INSERT INTO projects (project_id, user_id, name, description, type, settings, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [projectId, userId, project.name, project.description, project.type, 
       JSON.stringify(project.settings), project.createdAt]
    );

    // สร้าง Project Memory Space ว่าง
    await this.initializeProjectMemory(projectId);

    // สร้าง Agent Memories ว่างสำหรับโปรเจกนี้
    await this.initializeAgentProjectMemories(projectId);

    // ตั้งเป็นโปรเจก Active
    this.activeProjects.set(userId, projectId);
    await this.redis.set(`user:${userId}:active-project`, projectId);

    console.log(`✅ Project created: ${projectId} — ${project.name}`);
    
    return project;
  }

  // สลับโปรเจก — เปลี่ยน Context ทั้งหมด
  async switchProject(userId, projectId) {
    // ตรวจสอบว่าโปรเจกมีจริง
    const result = await this.db.query(
      'SELECT * FROM projects WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Project not found');
    }

    const project = result.rows[0];

    // บันทึกโปรเจกเก่าก่อนสลับ (ถ้ามี)
    const oldProjectId = this.activeProjects.get(userId);
    if (oldProjectId) {
      await this.archiveProjectContext(oldProjectId);
    }

    // สลับไปโปรเจกใหม่
    this.activeProjects.set(userId, projectId);
    await this.redis.set(`user:${userId}:active-project`, projectId);

    // โหลด Context ใหม่
    await this.loadProjectContext(projectId);

    // แจ้งทุก Agent ว่าสลับโปรเจกแล้ว
    await this.notifyAgentsProjectSwitch(projectId);

    console.log(`🔄 Switched to project: ${projectId} — ${project.name}`);

    return {
      success: true,
      project: {
        id: projectId,
        name: project.name,
        message: ` switched to "${project.name}". All agents are now focused on this project.`
      }
    };
  }

  // โหลด Context เฉพาะโปรเจก
  async loadProjectContext(projectId) {
    // โหลด Project-specific memories
    const memories = await this.getProjectMemories(projectId);
    
    // โหลด Project settings
    const settings = await this.getProjectSettings(projectId);
    
    // โหลด Recent activity ของโปรเจกนี้
    const history = await this.getProjectHistory(projectId, 20);

    // เก็บใน Redis สำหรับ quick access
    await this.redis.setex(`project:${projectId}:context`, 3600, JSON.stringify({
      memories,
      settings,
      history,
      loadedAt: new Date().toISOString()
    }));

    return { memories, settings, history };
  }

  // ดึง Memory เฉพาะโปรเจก
  async getProjectMemories(projectId) {
    const memories = {};
    
    const agents = ['research', 'uiux', 'frontend', 'backend', 'qa', 'pmba', 'supervisor', 'secretary'];
    
    for (const agent of agents) {
      const memoryKey = `project:${projectId}:agent:${agent}:memory`;
      const memory = await this.redis.get(memoryKey);
      
      if (memory) {
        memories[agent] = JSON.parse(memory);
      } else {
        // ถ้ายังไม่มี ให้ใช้ Default Memory
        memories[agent] = await this.getDefaultAgentMemory(agent);
      }
    }
    
    return memories;
  }

  // บันทึก Memory สำหรับโปรเจก
  async saveProjectMemory(projectId, agentName, memoryData) {
    const memoryKey = `project:${projectId}:agent:${agentName}:memory`;
    
    // เพิ่ม project context
    const enrichedMemory = {
      ...memoryData,
      projectId,
      lastUpdated: new Date().toISOString()
    };

    await this.redis.setex(memoryKey, 86400, JSON.stringify(enrichedMemory));
    
    // บันทึกลง Database ถาวร
    await this.db.query(
      `INSERT INTO project_memories (project_id, agent_name, memory_data, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (project_id, agent_name) 
       DO UPDATE SET memory_data = $3, updated_at = $4`,
      [projectId, agentName, JSON.stringify(enrichedMemory), new Date().toISOString()]
    );
  }

  // แจ้ง Agents ว่าสลับโปรเจกแล้ว
  async notifyAgentsProjectSwitch(projectId) {
    const context = await this.getProjectContext(projectId);
    
    const notification = {
      type: 'project:switched',
      projectId,
      projectName: context.name,
      techStack: context.settings.techStack,
      message: `All agents: You are now working on "${context.name}". Previous project context has been archived. Focus on the new requirements only.`,
      timestamp: new Date().toISOString()
    };

    // Broadcast ไปยังทุก Agent
    await this.redis.publish('agents:broadcast', JSON.stringify(notification));
    
    // บันทึกใน System Log
    console.log(`📢 Project switch notification sent for: ${projectId}`);
  }

  // ดึง Context ปัจจุบันของ User
  async getCurrentContext(userId) {
    const projectId = this.activeProjects.get(userId) || 
                      await this.redis.get(`user:${userId}:active-project`);
    
    if (!projectId) {
      return null;
    }

    const context = await this.redis.get(`project:${projectId}:context`);
    
    if (context) {
      return JSON.parse(context);
    }

    // ถ้าไม่มีใน Redis โหลดใหม่
    return this.loadProjectContext(projectId);
  }

  // Archive โปรเจกเก่า
  async archiveProjectContext(projectId) {
    // บันทึกสถานะสุดท้าย
    const finalState = await this.getProjectMemories(projectId);
    
    await this.db.query(
      `INSERT INTO project_archives (project_id, final_state, archived_at)
       VALUES ($1, $2, $3)`,
      [projectId, JSON.stringify(finalState), new Date().toISOString()]
    );

    // ล้าง Redis cache
    const keys = await this.redis.keys(`project:${projectId}:*`);
    if (keys.length > 0) {
      await this.redis.del(keys);
    }

    console.log(`📦 Project archived: ${projectId}`);
  }

  // ดึง Default Memory ของ Agent
  async getDefaultAgentMemory(agentName) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const filePath = path.join(__dirname, '../agent-memories', `${agentName}-agent.md`);
      const content = await fs.readFile(filePath, 'utf-8');
      
      return {
        type: 'default',
        content: content,
        source: 'template'
      };
    } catch {
      return {
        type: 'empty',
        content: '',
        source: 'none'
      };
    }
  }

  // Initialize สำหรับโปรเจกใหม่
  async initializeProjectMemory(projectId) {
    const initialMemory = {
      projectId,
      created: new Date().toISOString(),
      conversations: [],
      decisions: [],
      learnings: []
    };

    await this.redis.setex(`project:${projectId}:memory`, 86400, JSON.stringify(initialMemory));
  }

  async initializeAgentProjectMemories(projectId) {
    const agents = ['research', 'uiux', 'frontend', 'backend', 'qa', 'pmba', 'supervisor', 'secretary'];
    
    for (const agent of agents) {
      const defaultMemory = await this.getDefaultAgentMemory(agent);
      
      await this.saveProjectMemory(projectId, agent, {
        ...defaultMemory,
        projectSpecific: {
          tasksCompleted: [],
          patternsLearned: [],
          userPreferences: {}
        }
      });
    }
  }

  // ดึงรายการโปรเจกของ User
  async getUserProjects(userId) {
    const result = await this.db.query(
      `SELECT project_id, name, description, type, status, created_at 
       FROM projects 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }
}

module.exports = ProjectIsolationManager;
