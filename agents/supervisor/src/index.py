#!/usr/bin/env python3
"""
Supervisor Agent - Phase 4
Monitor ทุก Agent, วิเคราะห์ปัญหา, เสนอการอัปเกรด, รออนุมัติ
"""

import os
import json
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any

import redis
import psycopg2
from anthropic import Anthropic

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('supervisor-agent')


class SupervisorAgent:
    """
 Supervisor คอยดูแลทีมทั้งหมด:
    - Monitor สุขภาพ Agents (CPU, RAM, response time)
    - วิเคราะห์ปัญหาและ suggest การแก้ไข
    - เสนอแผนอัปเกรด Agent
    - ส่งเข้า Approval Queue ก่อนดำเนินการ
    """
    
    def __init__(self):
        self.name = os.getenv('AGENT_NAME', 'supervisor-agent')
        self.redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.api_key = os.getenv('ANTHROPIC_API_KEY')
        self.db_host = os.getenv('DB_HOST', 'localhost')
        
        self.redis_client = redis.from_url(self.redis_url, decode_responses=True)
        self.redis_pub = redis.from_url(self.redis_url, decode_responses=True)
        self.claude = Anthropic(api_key=self.api_key) if self.api_key else None
        
        self.agent_stats = {}
        self.approval_queue = []
        self.monitoring = False
        
    async def initialize(self):
        """เริ่มต้น Supervisor"""
        logger.info('Initializing Supervisor Agent...')
        
        self._announce_presence()
        
        # เริ่ม monitoring loop
        self.monitoring = True
        asyncio.create_task(self._monitoring_loop())
        
        logger.info('Supervisor ready - monitoring all agents')
        
    def _announce_presence(self):
        """ประกาศตัวเอง"""
        info = {
            'name': self.name,
            'type': 'supervisor',
            'status': 'active',
            'capabilities': ['monitor', 'analyze', 'suggest', 'approve'],
            'updated_at': datetime.now().isoformat()
        }
        self.redis_client.hset('agents', self.name, json.dumps(info))
        
    async def _monitoring_loop(self):
        """วน loop ตรวจสอบทุก 30 วินาที"""
        while self.monitoring:
            try:
                await self._check_all_agents()
                await asyncio.sleep(30)
            except Exception as e:
                logger.error(f'Monitoring error: {e}')
                await asyncio.sleep(5)
                
    async def _check_all_agents(self):
        """ตรวจสอบสถานะทุก Agent"""
        agents = self.redis_client.hgetall('agents')
        
        for name, data in agents.items():
            if name == self.name:
                continue
                
            try:
                agent = json.loads(data)
                await self._analyze_agent(name, agent)
            except Exception as e:
                logger.error(f'Error analyzing {name}: {e}')
                
    async def _analyze_agent(self, name: str, agent: Dict):
        """วิเคราะห์ Agent แต่ละตัว"""
        now = datetime.now()
        
        # เก็บ stats
        if name not in self.agent_stats:
            self.agent_stats[name] = []
            
        self.agent_stats[name].append({
            'timestamp': now.isoformat(),
            'status': agent.get('status'),
            'progress': agent.get('progress', 0)
        })
        
        # เก็บแค่ 100 รายการล่าสุด
        if len(self.agent_stats[name]) > 100:
            self.agent_stats[name] = self.agent_stats[name][-100:]
            
        # ตรวจหาปัญหา
        issues = self._detect_issues(name, agent)
        
        if issues:
            await self._handle_issues(name, agent, issues)
            
    def _detect_issues(self, name: str, agent: Dict) -> List[str]:
        """ตรวจหาปัญหา"""
        issues = []
        
        # Agent offline นานเกินไป
        if agent.get('status') == 'offline':
            last_update = agent.get('updated_at')
            if last_update:
                last = datetime.fromisoformat(last_update)
                if datetime.now() - last > timedelta(minutes=5):
                    issues.append('offline_too_long')
                    
        # Agent busy นานเกินไป
        if agent.get('status') == 'busy':
            stats = self.agent_stats.get(name, [])
            if len(stats) > 10:
                # เช็คว่า busy มากกว่า 5 นาทีไหม
                busy_count = sum(1 for s in stats[-10:] if s['status'] == 'busy')
                if busy_count >= 10:
                    issues.append('stuck_busy')
                    
        # Error rate สูง
        if agent.get('status') == 'error':
            issues.append('in_error_state')
            
        # Memory อาจไม่พอ (ถ้ามีข้อมูล)
        if agent.get('resources', {}).get('memory', 0) < 512:
            issues.append('low_memory')
            
        return issues
        
    async def _handle_issues(self, name: str, agent: Dict, issues: List[str]):
        """จัดการปัญหาที่พบ"""
        logger.warning(f'Issues detected for {name}: {issues}')
        
        for issue in issues:
            if issue == 'offline_too_long':
                await self._suggest_restart(name)
            elif issue == 'stuck_busy':
                await self._suggest_upgrade(name, 'restart')
            elif issue == 'in_error_state':
                await self._suggest_restart(name)
            elif issue == 'low_memory':
                await self._suggest_upgrade(name, 'memory')
                
    async def _suggest_restart(self, agent_name: str):
        """เสนอให้ restart agent"""
        suggestion = {
            'id': f'suggestion-{datetime.now().timestamp()}',
            'type': 'restart',
            'agent': agent_name,
            'reason': f'{agent_name} อาจมีปัญหา ควร restart',
            'action': {
                'type': 'upgrade-agent',
                'agentName': agent_name,
                'upgrades': { 'restart': True }
            },
            'estimated_downtime': '10 seconds',
            'created_at': datetime.now().isoformat()
        }
        
        await self._add_to_approval_queue(suggestion)
        
    async def _suggest_upgrade(self, agent_name: str, upgrade_type: str):
        """เสนอแผนอัปเกรด"""
        if upgrade_type == 'memory':
            suggestion = {
                'id': f'suggestion-{datetime.now().timestamp()}',
                'type': 'upgrade',
                'agent': agent_name,
                'reason': f'{agent_name} มี memory ไม่พอ ควรเพิ่ม',
                'action': {
                    'type': 'upgrade-agent',
                    'agentName': agent_name,
                    'upgrades': { 'resources': { 'memory': '1g' } }
                },
                'cost': 'เพิ่ม memory 512MB',
                'benefit': 'ลดโอกาส crash',
                'created_at': datetime.now().isoformat()
            }
        else:
            suggestion = {
                'id': f'suggestion-{datetime.now().timestamp()}',
                'type': 'restart',
                'agent': agent_name,
                'reason': f'{agent_name} ทำงานนานเกินไป ควร restart',
                'action': {
                    'type': 'upgrade-agent',
                    'agentName': agent_name,
                    'upgrades': { 'restart': True }
                },
                'created_at': datetime.now().isoformat()
            }
            
        await self._add_to_approval_queue(suggestion)
        
    async def _add_to_approval_queue(self, suggestion: Dict):
        """เพิ่มเข้า approval queue"""
        self.approval_queue.append(suggestion)
        
        # บันทึกลง Redis
        self.redis_client.set(
            f'supervisor:approval:{suggestion["id"]}',
            json.dumps(suggestion)
        )
        
        # แจ้งทุกคน
        self.redis_pub.publish('supervisor:approvals', json.dumps({
            'type': 'new_suggestion',
            'suggestion': suggestion
        }))
        
        logger.info(f'Suggestion added to queue: {suggestion["id"]}')
        
    async def approve_action(self, suggestion_id: str):
        """อนุมัติการดำเนินการ"""
        # หา suggestion
        data = self.redis_client.get(f'supervisor:approval:{suggestion_id}')
        if not data:
            return {'error': 'Suggestion not found'}
            
        suggestion = json.loads(data)
        
        # สั่งให้ factory ทำ
        self.redis_pub.publish('factory:commands', json.dumps(suggestion['action']))
        
        # อัปเดตสถานะ
        suggestion['status'] = 'approved'
        suggestion['approved_at'] = datetime.now().isoformat()
        
        self.redis_client.set(
            f'supervisor:approval:{suggestion_id}',
            json.dumps(suggestion)
        )
        
        # ลบออกจาก queue
        self.approval_queue = [s for s in self.approval_queue if s['id'] != suggestion_id]
        
        logger.info(f'Approved: {suggestion_id}')
        return {'success': True, 'suggestion': suggestion}
        
    async def reject_action(self, suggestion_id: str, reason: str = ''):
        """ปฏิเสธการดำเนินการ"""
        data = self.redis_client.get(f'supervisor:approval:{suggestion_id}')
        if not data:
            return {'error': 'Suggestion not found'}
            
        suggestion = json.loads(data)
        suggestion['status'] = 'rejected'
        suggestion['rejected_at'] = datetime.now().isoformat()
        suggestion['reject_reason'] = reason
        
        self.redis_client.set(
            f'supervisor:approval:{suggestion_id}',
            json.dumps(suggestion)
        )
        
        self.approval_queue = [s for s in self.approval_queue if s['id'] != suggestion_id]
        
        logger.info(f'Rejected: {suggestion_id}')
        return {'success': True}
        
    async def listen(self):
        """ฟังคำสั่งจาก user"""
        pubsub = self.redis_client.pubsub()
        pubsub.subscribe(f'agent:{self.name}:commands')
        
        for message in pubsub.listen():
            if message['type'] != 'message':
                continue
                
            try:
                cmd = json.loads(message['data'])
                await self.handle_command(cmd)
            except Exception as e:
                logger.error(f'Command error: {e}')
                
    async def handle_command(self, cmd: Dict):
        """ประมวลผลคำสั่ง"""
        action = cmd.get('action')
        
        if action == 'approve':
            result = await self.approve_action(cmd.get('suggestion_id'))
        elif action == 'reject':
            result = await self.reject_action(cmd.get('suggestion_id'), cmd.get('reason'))
        elif action == 'get_queue':
            result = {'queue': self.approval_queue}
        elif action == 'get_stats':
            result = {'stats': self.agent_stats}
        else:
            result = {'error': 'Unknown action'}
            
        # ส่งตอบกลับ
        self.redis_pub.publish('agents:results', json.dumps({
            'agent': self.name,
            'task_id': cmd.get('task_id'),
            'result': result
        }))


async def main():
    agent = SupervisorAgent()
    await agent.initialize()
    await agent.listen()


if __name__ == '__main__':
    asyncio.run(main())
