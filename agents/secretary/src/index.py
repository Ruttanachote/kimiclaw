#!/usr/bin/env python3
"""
Secretary Agent - Phase 2
เลขาส่วนตัวที่คุยกับ user และสั่งงาน Agents อื่น
"""

import os
import json
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, List

import redis
from anthropic import Anthropic

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('secretary-agent')


class SecretaryAgent:
    """
    เลขาส่วนตัว - คุยกับ user, เข้าใจความต้องการ, สั่งงาน Agents
    """
    
    def __init__(self):
        self.name = os.getenv('AGENT_NAME', 'secretary-agent')
        self.type = os.getenv('AGENT_TYPE', 'secretary')
        self.redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.api_key = os.getenv('ANTHROPIC_API_KEY')
        
        self.redis_client = redis.from_url(self.redis_url, decode_responses=True)
        self.redis_pub = redis.from_url(self.redis_url, decode_responses=True)
        
        # Claude client
        self.claude = Anthropic(api_key=self.api_key) if self.api_key else None
        
        self.status = 'idle'
        self.conversation_history = []
        
    async def initialize(self):
        """เริ่มต้น Agent"""
        logger.info('Initializing Secretary Agent...')
        
        self._announce_presence()
        logger.info('Secretary Agent ready!')
        
    def _announce_presence(self):
        """ประกาศตัวเองในระบบ"""
        info = {
            'name': self.name,
            'type': self.type,
            'status': self.status,
            'capabilities': ['chat', 'delegate', 'summarize', 'plan'],
            'updated_at': datetime.now().isoformat()
        }
        self.redis_client.hset('agents', self.name, json.dumps(info))
        
    async def listen(self):
        """ฟังคำสั่งจาก user และระบบ"""
        logger.info('Listening for commands...')
        
        pubsub = self.redis_client.pubsub()
        pubsub.subscribe(f'agent:{self.name}:commands')
        pubsub.subscribe('user:messages')  # คำสั่งจาก user โดยตรง
        
        for message in pubsub.listen():
            if message['type'] != 'message':
                continue
                
            try:
                data = json.loads(message['data'])
                logger.info(f'Received: {data}')
                await self.handle_command(data)
            except Exception as e:
                logger.error(f'Error: {e}')
                
    async def handle_command(self, command: Dict[str, Any]):
        """ประมวลผลคำสั่ง"""
        action = command.get('action')
        
        if action == 'chat':
            await self.handle_user_chat(command)
        elif action == 'delegate':
            await self.delegate_task(command)
        elif action == 'summarize':
            await self.summarize_conversation(command)
        else:
            logger.warning(f'Unknown action: {action}')
            
    async def handle_user_chat(self, command: Dict[str, Any]):
        """คุยกับ user และตัดสินใจว่าจะทำอะไร"""
        user_message = command.get('message', '')
        context = command.get('context', {})
        
        logger.info(f'User: {user_message}')
        
        # เก็บประวัติ
        self.conversation_history.append({
            'role': 'user',
            'content': user_message,
            'timestamp': datetime.now().isoformat()
        })
        
        # วิเคราะห์ว่าต้องการอะไร
        intent = self._analyze_intent(user_message)
        
        if intent['type'] == 'direct_command':
            # สั่งงาน Agent โดยตรง
            response = await self._execute_direct_command(intent, user_message)
        elif intent['type'] == 'question':
            # ตอบคำถาม
            response = await self._answer_question(user_message)
        elif intent['type'] == 'create_project':
            # สร้างโปรเจก
            response = await self._create_project(intent)
        else:
            # คุยทั่วไป
            response = await self._general_chat(user_message)
            
        # ส่งตอบกลับ
        self._send_response(response, command.get('task_id'))
        
        # เก็บประวัติ
        self.conversation_history.append({
            'role': 'assistant',
            'content': response,
            'timestamp': datetime.now().isoformat()
        })
        
    def _analyze_intent(self, message: str) -> Dict[str, Any]:
        """วิเคราะห์เจตนาจากข้อความ"""
        message_lower = message.lower()
        
        # สร้างโปรเจก
        if any(kw in message_lower for kw in ['สร้าง', 'create', 'new project', 'โปรเจก']):
            return {
                'type': 'create_project',
                'project_type': self._detect_project_type(message),
                'project_name': self._extract_project_name(message)
            }
            
        # ค้นหา
        if any(kw in message_lower for kw in ['หา', 'search', 'ค้น', 'หาข้อมูล']):
            return {
                'type': 'direct_command',
                'agent': 'research-agent',
                'action': 'search',
                'query': message
            }
            
        # ถามเกี่ยวกับระบบ
        if any(kw in message_lower for kw in ['ทำอะไรได้', 'ความสามารถ', 'help', 'ช่วยอะไร']):
            return {'type': 'question', 'topic': 'capabilities'}
            
        # คุยทั่วไป
        return {'type': 'general'}
        
    def _detect_project_type(self, message: str) -> str:
        """ตรวจสอบว่าจะสร้างโปรเจกอะไร"""
        msg = message.lower()
        if 'vue' in msg or 'frontend' in msg:
            return 'vue3'
        if 'react' in msg:
            return 'react'
        return 'vue3'  # default
        
    def _extract_project_name(self, message: str) -> str:
        """ดึงชื่อโปรเจกจากข้อความ"""
        # Simple extraction - เอาคำหลัง "สร้าง" หรือ "create"
        import re
        patterns = [
            r'สร้าง\s+(?:โปรเจก|โปรเจค|project)\s+(\w+)',
            r'create\s+(?:new\s+)?(?:project\s+)?(\w+)',
            r'new\s+project\s+(\w+)'
        ]
        for pattern in patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                return match.group(1)
        return 'my-project'
        
    async def _create_project(self, intent: Dict) -> str:
        """สร้างโปรเจกโดยสั่ง Frontend Agent"""
        project_name = intent['project_name']
        
        # สั่ง Frontend Agent
        command = {
            'action': 'setup-project',
            'projectName': project_name,
            'template': intent['project_type'],
            'task_id': f'proj-{datetime.now().timestamp()}',
            'notify': ['secretary-agent']  # บอกตัวเองเมื่อเสร็จ
        }
        
        self.redis_pub.publish('agent:frontend-agent:commands', json.dumps(command))
        
        # บอก user
        return f'กำลังสร้างโปรเจก "{project_name}" ด้วย {intent["project_type"]}...\nFrontend Agent กำลังทำงาน รอสักครู่นะคะ'
        
    async def _execute_direct_command(self, intent: Dict, message: str) -> str:
        """สั่งงาน Agent โดยตรง"""
        agent = intent.get('agent', 'research-agent')
        
        command = {
            'action': intent.get('action', 'search'),
            'query': intent.get('query', message),
            'task_id': f'cmd-{datetime.now().timestamp()}'
        }
        
        self.redis_pub.publish(f'agent:{agent}:commands', json.dumps(command))
        
        return f'สั่งงาน {agent} แล้วค่ะ กำลังดำเนินการ...'
        
    async def _answer_question(self, message: str) -> str:
        """ตอบคำถามเกี่ยวกับระบบ"""
        return '''สวัสดีค่ะ ฉันเป็นเลขาส่วนตัวของคุณ

ความสามารถที่มีตอนนี้:
• 💬 คุยกับคุณและเข้าใจความต้องการ
• 🌐 สั่ง Research Agent หาข้อมูล
• ⚙️ สั่ง Frontend Agent สร้างโปรเจก Vue 3
• 📋 จัดการงานและติดตาม progress

ตัวอย่างคำสั่ง:
- "สร้างโปรเจกชื่อ my-app"
- "หาข้อมูล Flutter best practices"
- "ช่วยสร้างเว็บร้านค้าหน่อย"

มีอะไรให้ช่วยไหมคะ?'''
        
    async def _general_chat(self, message: str) -> str:
        """คุยทั่วไป"""
        if self.claude:
            try:
                response = self.claude.messages.create(
                    model='claude-3-5-sonnet-20241022',
                    max_tokens=1000,
                    messages=[
                        {'role': 'user', 'content': message}
                    ]
                )
                return response.content[0].text
            except Exception as e:
                logger.error(f'Claude error: {e}')
                
        return f'เข้าใจค่ะ "{message}"\n\nถ้าต้องการให้ช่วยอะไรเฉพาะเจาะจง ลองพิมพ์ว่า "ช่วยสร้างโปรเจก" หรือ "หาข้อมูลเกี่ยวกับ..." ได้นะคะ'
        
    def _send_response(self, response: str, task_id: str = None):
        """ส่งตอบกลับไปยัง user"""
        message = {
            'type': 'secretary_response',
            'agent': self.name,
            'message': response,
            'task_id': task_id,
            'timestamp': datetime.now().isoformat()
        }
        
        # ส่งไปยัง user
        self.redis_pub.publish('user:responses', json.dumps(message))
        
        # บันทึก conversation
        self.redis_pub.publish('agents:conversation', json.dumps({
            'from': self.name,
            'to': 'user',
            'message': response,
            'timestamp': datetime.now().isoformat()
        }))
        
    async def delegate_task(self, command: Dict):
        """สั่งงาน Agents อื่น"""
        target_agent = command.get('target_agent')
        task = command.get('task')
        
        if target_agent and task:
            self.redis_pub.publish(
                f'agent:{target_agent}:commands',
                json.dumps(task)
            )
            
    async def summarize_conversation(self, command: Dict):
        """สรุปบทสนทนา"""
        # TODO: ใช้ Claude สรุป
        pass


async def main():
    agent = SecretaryAgent()
    await agent.initialize()
    await agent.listen()


if __name__ == '__main__':
    asyncio.run(main())
