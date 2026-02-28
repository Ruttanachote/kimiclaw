# AI DevStudio - Quick Start Guide

## 🚀 เริ่มต้นใช้งานใน 5 นาที

### ขั้นตอนที่ 1: เตรียมเครื่อง

ติดตั้งบน Windows:
1. **Docker Desktop** → https://docker.com/products/docker-desktop
2. **Node.js LTS** → https://nodejs.org

### ขั้นตอนที่ 2: ดาวน์โหลดโปรเจก

```powershell
# สร้างโฟลเดอร์
mkdir C:\AI-DevStudio
cd C:\AI-DevStudio

# แตกไฟล์ที่ได้รับ (หรือ clone จาก git)
```

### ขั้นตอนที่ 3: ตั้งค่า API Keys

แก้ไขไฟล์ `.env`:

```env
# สำคัญ: ต้องใส่
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxx

# Optional
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
FIGMA_API_KEY=figd_xxxxxxxxxxxxxxxxxxxx

# อื่น ๆ (ไม่ต้องแก้ก็ได้)
VNC_PASSWORD=devstudio123
DB_USER=devstudio
DB_PASSWORD=devstudio123
DB_NAME=devstudio
N8N_USER=admin
N8N_PASSWORD=admin123
JWT_SECRET=your-secret-key
```

ไปเอา API Key:
- Anthropic: https://console.anthropic.com
- OpenAI: https://platform.openai.com
- Figma: https://www.figma.com/developers

### ขั้นตอนที่ 4: รันระบบ

```powershell
cd C:\AI-DevStudio
.\scripts\deploy.ps1
```

รอ 2-3 นาที ระบบจะ:
- ✅ ตรวจสอบ environment
- ✅ Build Web UI
- ✅ Start 13 containers
- ✅ ตรวจสุขภาพทุก service

### ขั้นตอนที่ 5: เปิดใช้งาน

เปิด browser:
- **http://localhost** → Main App
- **http://localhost:5678** → N8N (admin/admin123)

---

## 💬 การใช้งานพื้นฐาน

### 1. คุยกับเลขา

พิมพ์ในช่องแชท:
```
สร้างโปรเจกชื่อ my-shop
```

เลขาจะ:
1. สร้าง project ใหม่
2. สั่ง Research หาข้อมูล
3. สั่ง UI/UX ออกแบบ
4. สั่ง Frontend สร้างโค้ด
5. แจ้งความคืบหน้า

### 2. ดู Agents ทำงาน

ที่หน้า **Live Conversation** จะเห็นบทสนทนา:
```
Secretary → Frontend: สร้างโปรเจก my-shop
Frontend → Secretary: กำลังสร้าง Vue 3 project...
Frontend → Secretary: ✅ เสร็จแล้ว!
```

### 3. สร้าง Agent ใหม่

กด **➕ New Agent** → เลือก:
- Template: Research / Frontend / Backend / etc.
- AI Model: Claude / GPT-4 / Local
- Memory: 512MB - 4GB
- Capabilities

### 4. สลับโปรเจก

ใช้ dropdown บน header:
```
📁 Default Project
📁 my-shop
📁 my-app
```

### 5. อนุมัติการอัปเกรด

เมื่อ Supervisor พบปัญหา:
- จะขึ้นใน **Approval Queue**
- กด **✓ Approve** หรือ **✕ Reject**

---

## 🛠️ คำสั่งที่ใช้บ่อย

```powershell
# รันระบบ
.\scripts\deploy.ps1

# หยุดระบบ
.\scripts\stop.ps1

# ดู logs
docker compose -f docker/docker-compose.yml logs -f

# รีสตาร์ท agent เดียว
docker restart ai-devstudio-research

# เข้าไปใน container
docker exec -it ai-devstudio-research bash
```

---

## 🔧 แก้ไขปัญหา

### Port ถูกใช้งาน
```powershell
# เช็คว่าอะไรใช้ port 80
netstat -ano | findstr :80

# หรือแก้ docker-compose.yml เปลี่ยน port
```

### Docker ไม่ start
```powershell
# เช็ค status
 docker compose -f docker/docker-compose.yml ps

# ดู logs
 docker compose -f docker/docker-compose.yml logs api-gateway
```

### Web UI build ไม่ผ่าน
```powershell
cd web
npm install
npm run build
```

### ล้างทั้งหมดเริ่มใหม่
```powershell
docker compose -f docker/docker-compose.yml down -v
docker system prune -a
.\scripts\deploy.ps1
```

---

## 📚 เอกสารเพิ่มเติม

| หัวข้อ | ไฟล์ |
|:---|:---|
| โครงสร้างโปรเจก | README.md |
| API Reference | api/src/server.js |
| Database Schema | database/init/001_init.sql |
| Agent Code | agents/*/src/ |

---

## 🆘 ติดต่อ Support

ถ้ามีปัญหา:
1. เช็ค logs: `docker compose logs`
2. รัน test: `.\scripts\deploy.ps1 -TestOnly`
3. ถามผมได้เลย

---

**Happy Coding! 🚀**

*AI DevStudio - Your AI Development Team*
