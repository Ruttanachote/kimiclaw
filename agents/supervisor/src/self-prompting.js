// Self-Prompting Agent System
// Agents คิดเอง วางแผนเอง ทำงานเอง ไม่ต้องรอสั่งทีละขั้น

const { v4: uuidv4 } = require('uuid');

class SelfPromptingEngine {
  constructor(redis, aiProxy) {
    this.redis = redis;
    this.aiProxy = aiProxy;
    this.activeTasks = new Map();
  }

  // Main entry: รับ goal แล้วคิดเองว่าจะทำยังไง
  async executeGoal(goal, context = {}) {
    const taskId = uuidv4();
    
    console.log(`🎯 New Goal: ${goal}`);
    
    // Step 1: วิเคราะห์ goal และสร้างแผน
    const plan = await this.createPlan(goal, context);
    
    // Step 2: เริ่ม execute แบบ recursive
    const result = await this.executePlan(taskId, plan, context);
    
    return {
      taskId,
      goal,
      plan,
      result,
      completed: true
    };
  }

  // สร้างแผนการทำงานจาก goal
  async createPlan(goal, context) {
    const prompt = `
You are a project planning AI. Break down the following goal into specific, actionable steps.
Each step should specify which agent to use and what action to take.

Goal: "${goal}"
Context: ${JSON.stringify(context)}

Available agents:
- research-agent: Web search, data collection
- uiux-agent: Design, wireframes, Figma
- frontend-agent: Vue/React development
- backend-agent: API, database
- qa-agent: Testing, security scan
- pmba-agent: Documentation, reports

Return a JSON plan like:
{
  "steps": [
    {"order": 1, "agent": "research-agent", "action": "search", "params": {...}},
    {"order": 2, "agent": "uiux-agent", "action": "create-wireframe", "params": {...}}
  ],
  "estimatedTime": "30 minutes",
  "dependencies": [[2, 1]] // step 2 depends on step 1
}
`;

    const response = await this.aiProxy.generate({
      model: 'claude-3-5-sonnet',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2
    });

    try {
      return JSON.parse(response.content);
    } catch {
      // Fallback: create simple sequential plan
      return this.createFallbackPlan(goal);
    }
  }

  // Execute plan แบบ recursive และ adaptive
  async executePlan(taskId, plan, context, currentStep = 0) {
    const results = [];
    
    for (let i = currentStep; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      
      console.log(`  Step ${i + 1}/${plan.steps.length}: ${step.agent} - ${step.action}`);
      
      // Check dependencies
      const deps = plan.dependencies?.filter(d => d[0] === i + 1).map(d => d[1]) || [];
      for (const dep of deps) {
        if (!results[dep - 1]) {
          console.log(`    Waiting for step ${dep}...`);
          // Wait or handle dependency
        }
      }

      try {
        // Execute step
        const result = await this.executeStep(step, context, results);
        results.push({ step: i + 1, success: true, result });
        
        // Update context with result
        context[`step_${i + 1}_result`] = result;
        
        // Check if we need to adjust plan
        const shouldAdjust = await this.evaluateAndAdjust(goal, plan, results, i);
        
        if (shouldAdjust.adjust) {
          console.log(`  🔄 Adjusting plan based on results...`);
          plan = shouldAdjust.newPlan;
          i = shouldAdjust.continueFrom - 1; // Will be incremented by loop
        }
        
      } catch (error) {
        console.error(`  ❌ Step ${i + 1} failed:`, error.message);
        
        // Try to recover
        const recovery = await self.attemptRecovery(step, error, context);
        
        if (recovery.success) {
          console.log(`  ✅ Recovered: ${recovery.action}`);
          results.push({ step: i + 1, success: true, result: recovery.result, recovered: true });
        } else {
          results.push({ step: i + 1, success: false, error: error.message });
          
          // Ask user for help
          const userInput = await this.askUserForHelp(step, error);
          if (userInput) {
            context.user_guidance = userInput;
            i--; // Retry this step
          }
        }
      }
    }

    return results;
  }

  // Execute single step
  async executeStep(step, context, previousResults) {
    // Enrich params with context
    const enrichedParams = {
      ...step.params,
      context: {
        ...context,
        previousResults
      }
    };

    // Send to agent
    const result = await this.sendToAgent(step.agent, {
      action: step.action,
      ...enrichedParams,
      task_id: uuidv4()
    });

    return result;
  }

  // ประเมินผลและปรับแผน
  async evaluateAndAdjust(goal, plan, results, currentIndex) {
    const lastResult = results[results.length - 1];
    
    // Check if result indicates we need different approach
    const prompt = `
Goal: "${goal}"
Current plan step: ${currentIndex + 1}/${plan.steps.length}
Last result: ${JSON.stringify(lastResult)}

Should we adjust the remaining plan? 
If yes, provide new steps from step ${currentIndex + 2}.

Return JSON:
{
  "adjust": true/false,
  "reason": "why",
  "newPlan": { "steps": [...] }, // only remaining steps
  "continueFrom": step number
}
`;

    try {
      const response = await this.aiProxy.generate({
        model: 'claude-3-5-sonnet',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      });

      return JSON.parse(response.content);
    } catch {
      return { adjust: false };
    }
  }

  // พยายาม recover จาก error
  async attemptRecovery(step, error, context) {
    const prompt = `
Step failed:
- Agent: ${step.agent}
- Action: ${step.action}
- Error: ${error.message}
- Context: ${JSON.stringify(context)}

Suggest recovery action:
1. Retry with different params
2. Use alternative agent
3. Skip and continue
4. Ask user

Return JSON: { "action": "retry|alternative|skip|ask", "params": {...} }
`;

    try {
      const response = await this.aiProxy.generate({
        model: 'claude-3-5-sonnet',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      });

      const recovery = JSON.parse(response.content);
      
      if (recovery.action === 'retry') {
        const result = await this.executeStep({
          ...step,
          params: { ...step.params, ...recovery.params }
        }, context, []);
        return { success: true, result, action: 'retry' };
      }
      
      if (recovery.action === 'alternative') {
        const altStep = { ...step, agent: recovery.params.alternativeAgent };
        const result = await this.executeStep(altStep, context, []);
        return { success: true, result, action: 'alternative' };
      }

      return { success: false, action: recovery.action };
    } catch {
      return { success: false, action: 'ask' };
    }
  }

  // ถาม user เมื่อติดปัญหา
  async askUserForHelp(step, error) {
    // In real implementation, this would send notification to user
    // and wait for response via WebSocket
    
    console.log(`  🙋 Asking user for help with ${step.agent}...`);
    
    // For now, return null (will need user interaction)
    return null;
  }

  // Fallback plan creation
  createFallbackPlan(goal) {
    return {
      steps: [
        { order: 1, agent: 'research-agent', action: 'search', params: { query: goal } },
        { order: 2, agent: 'frontend-agent', action: 'setup-project', params: { projectName: 'auto-generated' } }
      ],
      dependencies: [[2, 1]]
    };
  }

  // Send command to agent via Redis
  async sendToAgent(agentName, command) {
    return new Promise((resolve, reject) => {
      const channel = `agent:${agentName}:commands`;
      const responseChannel = `task:${command.task_id}:result`;
      
      // Subscribe to response
      const subscriber = this.redis.duplicate();
      subscriber.subscribe(responseChannel, (message) => {
        subscriber.unsubscribe(responseChannel);
        const data = JSON.parse(message);
        
        if (data.status === 'completed') {
          resolve(data.result);
        } else {
          reject(new Error(data.error || 'Task failed'));
        }
      });

      // Publish command
      this.redis.publish(channel, JSON.stringify(command));

      // Timeout
      setTimeout(() => {
        subscriber.unsubscribe(responseChannel);
        reject(new Error('Task timeout'));
      }, 120000); // 2 minutes
    });
  }
}

module.exports = SelfPromptingEngine;
