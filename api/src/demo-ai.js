// Demo/Mock AI Service - ใช้งานได้ทันทีไม่ต้อง API Key
// ตอบแบบ template + จำลองการทำงาน

class DemoAIService {
  constructor() {
    this.mode = 'demo' // 'demo' | 'real'
    this.requestCount = 0
    this.dailyLimit = 50
  }

  // Secretary responses (ไม่ต้อง AI)
  getSecretaryResponse(userMessage) {
    const msg = userMessage.toLowerCase()
    
    // Pattern matching แทน AI
    if (msg.includes('สร้าง') || msg.includes('create')) {
      return {
        type: 'action',
        message: `🎯 ฉันเข้าใจว่าคุณต้องการสร้างโปรเจก!

กำลังสั่งงานให้ทีม:
• 🔍 Research: หาข้อมูล reference
• 🎨 UI/UX: ออกแบบ wireframe  
• ⚛️ Frontend: สร้าง Vue 3 project
• 🔧 Backend: สร้าง API

⏳ รอสักครู่นะคะ...`,
        actions: [
          { agent: 'research', command: { action: 'search', query: 'best practices' } },
          { agent: 'frontend', command: { action: 'setup-project', projectName: this.extractProjectName(msg) } }
        ]
      }
    }
    
    if (msg.includes('หา') || msg.includes('search')) {
      return {
        type: 'action',
        message: `🔍 ได้ค่ะ ฉันจะสั่ง Research Agent หาข้อมูลให้

กำลังค้นหา: "${userMessage}"`,
        actions: [
          { agent: 'research', command: { action: 'search', query: userMessage } }
        ]
      }
    }
    
    if (msg.includes('ช่วย') || msg.includes('help')) {
      return {
        type: 'info',
        message: `👋 สวัสดีค่ะ! ฉันเป็นเลขาส่วนตัวของคุณ

**สิ่งที่ฉันทำได้:**
• 💬 คุยและเข้าใจความต้องการ
• 📋 แยกงานและสั่ง Agents
• 📊 ติดตามความคืบหน้า

**ตัวอย่างคำสั่ง:**
• "สร้างโปรเจกชื่อ my-shop"
• "หาข้อมูล Flutter best practices"
• "ช่วยสร้างเว็บร้านค้า"

---
⚠️ **Demo Mode**: ตอบนี้เป็น template ไม่ใช่ AI จริง
🔓 [อัปเกรดใช้ Claude AI](javascript:showUpgradeModal())
`
      }
    }
    
    // Default response
    return {
      type: 'chat',
      message: `เข้าใจค่ะ "${userMessage}" 

ฉันบันทึกไว้แล้ว ถ้าต้องการให้ช่วยอะไรเฉพาะเจาะจง ลองพิมพ์:
• "สร้างโปรเจก [ชื่อ]"
• "หาข้อมูล [หัวข้อ]"
• "ช่วยเขียน [ส่วนไหน]"

---
💡 **Tip**: อัปเกรดใช้ Claude AI เพื่อตอบที่ฉลาดและเข้าใจบริบทมากขึ้น`
    }
  }

  // Mock agent responses
  getMockAgentResponse(agentType, command) {
    const responses = {
      research: {
        browse: { success: true, title: 'Mock Page', content: 'This is simulated content' },
        search: { success: true, results: ['Result 1', 'Result 2', 'Result 3'] }
      },
      frontend: {
        'setup-project': { 
          success: true, 
          message: '✅ Project created (Demo Mode)',
          projectPath: '/demo/project'
        }
      },
      backend: {
        'create-api': {
          success: true,
          message: '✅ API endpoints created (Demo Mode)',
          endpoints: ['/api/users', '/api/products']
        }
      }
    }
    
    return responses[agentType]?.[command.action] || { 
      success: true, 
      message: '✅ Task completed (Demo Mode)' 
    }
  }

  // Check if should use real AI
  shouldUseRealAI() {
    return this.mode === 'real' && process.env.ANTHROPIC_API_KEY
  }

  // Extract project name from message
  extractProjectName(message) {
    const match = message.match(/ชื่อ\s+(\w+)|project\s+(\w+)|create\s+(\w+)/i)
    return match?.[1] || match?.[2] || match?.[3] || 'my-project'
  }

  // Get usage stats
  getStats() {
    return {
      mode: this.mode,
      used: this.requestCount,
      limit: this.dailyLimit,
      remaining: this.dailyLimit - this.requestCount
    }
  }
}

module.exports = DemoAIService
