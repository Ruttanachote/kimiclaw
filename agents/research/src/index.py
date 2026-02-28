#!/usr/bin/env python3
"""
Research Agent - Phase 1
ทำหน้าที่: เปิดเว็บ ค้นหาข้อมูล อ่านเนื้อหา แคปหน้าจอ
เห็นผล: ดูหน้าจอผ่าน browser ที่ http://localhost/vnc/
"""

import os
import sys
import json
import asyncio
import logging
from datetime import datetime
from typing import Optional, Dict, Any

# Playwright สำหรับควบคุม Chrome
from playwright.async_api import async_playwright, Page, Browser

# Redis สำหรับรับคำสั่งและส่งผลลัพธ์
import redis

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('research-agent')


class ResearchAgent:
    """
    Agent สำหรับค้นหาและวิจัยข้อมูลบนเว็บ
    ความสามารถ:
    - เปิดเว็บไซต์
    - คลิก element
    - พิมพ์ข้อความ
    - อ่านเนื้อหา
    - แคปหน้าจอ
    - เลื่อนหน้า
    """
    
    def __init__(self):
        self.name = os.getenv('AGENT_NAME', 'research-agent')
        self.agent_type = os.getenv('AGENT_TYPE', 'research')
        self.redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        
        # Redis connection
        self.redis_client = redis.from_url(self.redis_url, decode_responses=True)
        
        # Browser state
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.playwright = None
        
        # Task state
        self.current_task: Optional[Dict[str, Any]] = None
        self.status = 'idle'  # idle, busy, error
        self.progress = 0
        
    async def initialize(self):
        """เริ่มต้น Chrome browser"""
        logger.info('Initializing Research Agent...')
        
        self.playwright = await async_playwright().start()
        
        # เปิด Chrome แบบมี GUI (เห็นผ่าน VNC)
        self.browser = await self.playwright.chromium.launch(
            headless=False,  # สำคัญ: ต้อง False เพื่อให้เห็นหน้าจอ
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080',
                '--start-maximized'
            ]
        )
        
        self.page = await self.browser.new_page(
            viewport={'width': 1920, 'height': 1080}
        )
        
        # เปิดหน้าเริ่มต้น
        await self.page.goto('about:blank')
        
        # ประกาศตัวเองใน Redis
        self._announce_presence()
        
        logger.info('Research Agent ready!')
        
    def _announce_presence(self):
        """บอกระบบว่าตัวเองพร้อมทำงาน"""
        agent_info = {
            'name': self.name,
            'type': self.agent_type,
            'status': self.status,
            'progress': self.progress,
            'capabilities': ['browse', 'search', 'click', 'type', 'screenshot', 'scroll'],
            'updated_at': datetime.now().isoformat()
        }
        self.redis_client.hset('agents', self.name, json.dumps(agent_info))
        logger.info(f'Announced presence: {self.name}')
        
    async def listen_for_commands(self):
        """ฟังคำสั่งจาก Redis แบบ real-time"""
        logger.info('Listening for commands...')
        
        # Subscribe ช่องคำสั่ง
        pubsub = self.redis_client.pubsub()
        pubsub.subscribe(f'agent:{self.name}:commands')
        pubsub.subscribe('agents:broadcast')  # คำสั่งทั่วไป
        
        for message in pubsub.listen():
            if message['type'] != 'message':
                continue
                
            try:
                command = json.loads(message['data'])
                logger.info(f'Received command: {command}')
                
                # ประมวลผลคำสั่ง
                await self.handle_command(command)
                
            except Exception as e:
                logger.error(f'Error handling command: {e}')
                self._report_error(str(e))
                
    async def handle_command(self, command: Dict[str, Any]):
        """ประมวลผลคำสั่งต่าง ๆ"""
        action = command.get('action')
        task_id = command.get('task_id', 'unknown')
        
        # อัปเดตสถานะ
        self.current_task = command
        self.status = 'busy'
        self.progress = 0
        self._update_status()
        
        try:
            if action == 'browse':
                result = await self.action_browse(command.get('url'))
            elif action == 'search':
                result = await self.action_search(command.get('query'))
            elif action == 'click':
                result = await self.action_click(command.get('selector'))
            elif action == 'type':
                result = await self.action_type(
                    command.get('selector'),
                    command.get('text')
                )
            elif action == 'screenshot':
                result = await self.action_screenshot(command.get('filename'))
            elif action == 'scroll':
                result = await self.action_scroll(command.get('direction', 'down'))
            elif action == 'read':
                result = await self.action_read()
            else:
                result = {'error': f'Unknown action: {action}'}
                
            # ส่งผลลัพธ์กลับ
            self._report_result(task_id, result)
            
        except Exception as e:
            logger.error(f'Action failed: {e}')
            self._report_error(str(e))
            
        finally:
            self.status = 'idle'
            self.progress = 100
            self._update_status()
            
    # ===== Actions =====
    
    async def action_browse(self, url: str) -> Dict:
        """เปิดเว็บไซต์"""
        if not url:
            return {'error': 'No URL provided'}
            
        logger.info(f'Browsing: {url}')
        await self.page.goto(url, wait_until='networkidle')
        
        title = await self.page.title()
        self.progress = 100
        
        return {
            'success': True,
            'url': self.page.url,
            'title': title,
            'message': f'Opened {url}'
        }
        
    async def action_search(self, query: str) -> Dict:
        """ค้นหาด้วย Google"""
        if not query:
            return {'error': 'No query provided'}
            
        logger.info(f'Searching: {query}')
        
        # ไป Google
        await self.page.goto('https://www.google.com')
        
        # พิมพ์คำค้นหา
        await self.page.fill('textarea[name="q"]', query)
        await self.page.press('textarea[name="q"]', 'Enter')
        
        # รอผลลัพธ์
        await self.page.wait_for_selector('div#search', timeout=10000)
        
        # ดึงผลลัพธ์แรก ๆ
        results = await self.page.eval_on_selector_all(
            'div.g h3',
            'elements => elements.slice(0, 5).map(e => e.innerText)'
        )
        
        self.progress = 100
        
        return {
            'success': True,
            'query': query,
            'results': results,
            'message': f'Found {len(results)} results'
        }
        
    async def action_click(self, selector: str) -> Dict:
        """คลิก element"""
        if not selector:
            return {'error': 'No selector provided'}
            
        logger.info(f'Clicking: {selector}')
        await self.page.click(selector)
        
        return {
            'success': True,
            'selector': selector,
            'message': f'Clicked {selector}'
        }
        
    async def action_type(self, selector: str, text: str) -> Dict:
        """พิมพ์ข้อความ"""
        if not selector or not text:
            return {'error': 'Selector and text required'}
            
        logger.info(f'Typing "{text}" into {selector}')
        await self.page.fill(selector, text)
        
        return {
            'success': True,
            'selector': selector,
            'text': text,
            'message': f'Typed into {selector}'
        }
        
    async def action_screenshot(self, filename: Optional[str] = None) -> Dict:
        """แคปหน้าจอ"""
        if not filename:
            filename = f'screenshot_{datetime.now().strftime("%Y%m%d_%H%M%S")}.png'
            
        filepath = f'/app/outputs/{filename}'
        
        logger.info(f'Taking screenshot: {filepath}')
        await self.page.screenshot(path=filepath, full_page=True)
        
        return {
            'success': True,
            'filename': filename,
            'filepath': filepath,
            'message': f'Saved screenshot to {filename}'
        }
        
    async def action_scroll(self, direction: str = 'down') -> Dict:
        """เลื่อนหน้า"""
        logger.info(f'Scrolling {direction}')
        
        if direction == 'down':
            await self.page.evaluate('window.scrollBy(0, 800)')
        elif direction == 'up':
            await self.page.evaluate('window.scrollBy(0, -800)')
        elif direction == 'bottom':
            await self.page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
            
        return {
            'success': True,
            'direction': direction,
            'message': f'Scrolled {direction}'
        }
        
    async def action_read(self) -> Dict:
        """อ่านเนื้อหาหน้าปัจจุบัน"""
        logger.info('Reading page content')
        
        title = await self.page.title()
        
        # ดึง text หลัก ๆ
        content = await self.page.eval_on_selector(
            'body',
            '''body => {
                // ลบ script, style ออก
                const scripts = body.querySelectorAll('script, style, nav, footer');
                scripts.forEach(s => s.remove());
                return body.innerText.slice(0, 5000); // จำกัดความยาว
            }'''
        )
        
        return {
            'success': True,
            'title': title,
            'url': self.page.url,
            'content': content,
            'message': f'Read {len(content)} characters'
        }
        
    # ===== Status Reporting =====
    
    def _update_status(self):
        """อัปเดตสถานะใน Redis"""
        agent_info = {
            'name': self.name,
            'type': self.agent_type,
            'status': self.status,
            'progress': self.progress,
            'current_task': self.current_task,
            'updated_at': datetime.now().isoformat()
        }
        self.redis_client.hset('agents', self.name, json.dumps(agent_info))
        
    def _report_result(self, task_id: str, result: Dict):
        """ส่งผลลัพธ์กลับ"""
        message = {
            'task_id': task_id,
            'agent': self.name,
            'status': 'completed',
            'result': result,
            'timestamp': datetime.now().isoformat()
        }
        self.redis_client.publish(f'task:{task_id}:result', json.dumps(message))
        self.redis_client.publish('agents:results', json.dumps(message))
        logger.info(f'Reported result for task {task_id}')
        
    def _report_error(self, error: str):
        """รายงาน error"""
        message = {
            'agent': self.name,
            'status': 'error',
            'error': error,
            'timestamp': datetime.now().isoformat()
        }
        self.redis_client.publish('agents:errors', json.dumps(message))
        
    async def shutdown(self):
        """ปิดตัวลงอย่างสะอาด"""
        logger.info('Shutting down...')
        
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
            
        # บอกระบบว่าออกแล้ว
        self.redis_client.hdel('agents', self.name)
        
        logger.info('Research Agent stopped')


async def main():
    """Main entry point"""
    agent = ResearchAgent()
    
    try:
        await agent.initialize()
        await agent.listen_for_commands()
    except KeyboardInterrupt:
        logger.info('Received shutdown signal')
    finally:
        await agent.shutdown()


if __name__ == '__main__':
    asyncio.run(main())
