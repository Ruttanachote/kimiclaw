# AI DevStudio

ระบบจัดการทีม AI Agents สำหรับการพัฒนาซอฟต์แวร์ - ครบทุกฟีเจอร์ที่คุณต้องการ

## ✨ ความสามารถหลัก

- 🤖 **8 AI Agents** ทำงานเป็นทีม
- 💬 **เลขาส่วนตัว** สั่งงานเป็นภาษาไทย/อังกฤษ
- 👁️ **Supervisor** คอย monitor และเสนอการอัปเกรด
- 🔧 **N8N** Workflow Engine ครบถ้วน
- 🎨 **Figma Integration** ออกแบบ UI ได้จริง
- 🧪 **Security & Performance Testing** ด้วย ZAP + k6
- 📊 **Export** Excel, PowerPoint
- 🔐 **Authentication** ปลอดภัย

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│           Web UI (Vue3)                 │
│  Dashboard | Chat | VNC | Projects      │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Nginx (Reverse Proxy)           │
└─────────────────┬───────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    ▼             ▼             ▼
┌───────┐    ┌───────┐    ┌─────────┐
│  N8N  │    │  API  │    │ noVNC   │
│5678   │    │Gateway│    │(Research│
│       │    │:3000  │    │  Agent) │
└───┬───┘    └───┬───┘    └─────────┘
    │            │
    └────────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
┌────────┐   ┌────────┐
│  Redis │   │PostgreSQL│
│ (Pub/Sub)  │  (Data)  │
└────────┘   └────────┘
```

---

## 🚀 Quick Start

```powershell
# 1. Clone หรือแตกไฟล์
cd C:\AI-DevStudio

# 2. ตั้งค่า API Keys
notepad .env

# 3. Deploy ทั้งระบบ
.\scripts\deploy.ps1

# 4. เปิด browser
http://localhost
```

ดู [QUICKSTART.md](QUICKSTART.md) สำหรับรายละเอียด

---

## 👥 Agents (8 ตัว)

| Agent | หน้าที่ | Tools |
|:---|:---|:---|
| 🔍 **Research** | ค้นหาข้อมูล, เปิดเว็บ | Chrome, Playwright, VNC |
| 🎨 **UI/UX** | ออกแบบ interface | Figma API, Builder.io |
| ⚛️ **Frontend** | พัฒนา frontend | Vue3, React, Vite, Tailwind |
| 🔧 **Backend** | สร้าง API, Database | Node.js, Express, Docker |
| 🧪 **QA** | Test ระบบ | Jest, Cypress, ZAP, k6 |
| 📊 **PM/BA** | จัดการโปรเจก | Excel, PowerPoint, Gantt |
| 👁️ **Supervisor** | Monitor, อนุมัติ | Analytics, Approval Queue |
| 💬 **Secretary** | คุยกับ user | Claude API |

---

## 💡 ตัวอย่างการใช้งาน

### สร้างเว็บร้านค้า

**คุณพิมพ์:**
```
สร้างโปรเจกชื่อ my-shop เป็นเว็บขายของ
```

**ระบบทำ:**
1. Secretary สร้าง project
2. Research หา reference
3. UI/UX ออกแบบ wireframe
4. Frontend สร้าง Vue 3
5. Backend สร้าง API + Database
6. QA เขียน test cases
7. PM/BA สร้างรายงาน
8. Supervisor คอยดูทั้งหมด

**คุณได้:**
- โค้ดเว็บพร้อมใช้
- เอกสารครบ
- ระบบ test ครบ

---

## 📁 โครงสร้างโปรเจก

```
AI-DevStudio/
├── docker/                 # Docker Compose
├── api/                    # API Gateway (Node.js)
├── agent-factory/          # สร้าง Agents ได้
├── agents/                 # 8 Agents
│   ├── research/
│   ├── uiux/
│   ├── frontend/
│   ├── backend/
│   ├── qa/
│   ├── pmba/
│   ├── supervisor/
│   └── secretary/
├── web/                    # Vue3 Frontend
├── database/               # PostgreSQL Schema
├── scripts/                # PowerShell Scripts
├── shared/                 # Outputs, Projects
└── docs/                   # Documentation
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|:---|:---|
| Frontend | Vue 3, TypeScript, Tailwind CSS, Vite |
| Backend | Node.js, Express, WebSocket |
| Database | PostgreSQL 16, Redis 7 |
| Workflow | N8N |
| AI | Anthropic Claude, OpenAI GPT |
| DevOps | Docker, Docker Compose |

---

## 📊 4 Phases ของการพัฒนา

| Phase | สิ่งที่ได้ | Agents |
|:---|:---|:---:|
| **1** | Foundation | 1 |
| **2** | Multi-Agent + Chat | 3 |
| **3** | Configurable + Spawnable | 3+ |
| **4** | **Full Team + Complete** | **8** |

---

## 🔐 Security

- JWT Authentication
- Password hashing (bcrypt)
- API Keys ไม่ถูก expose
- Project isolation
- VNC password protection

---

## 📚 Documentation

- [QUICKSTART.md](QUICKSTART.md) - เริ่มต้นใช้งาน
- [API Documentation](api/src/server.js) - REST API
- [Database Schema](database/init/001_init.sql) - PostgreSQL

---

## 🤝 Contributing

ต้องการเพิ่มฟีเจอร์?
1. Fork โปรเจก
2. สร้าง branch
3. Commit changes
4. ส่ง Pull Request

---

## 📄 License

MIT License - ใช้งานได้ฟรี

---

## 🙏 Credits

สร้างด้วยความตั้งใจสำหรับทีมพัฒนาซอฟต์แวร์

**AI DevStudio** - *Your AI Development Team*

---

*สร้างเมื่อ: 2024 | เวอร์ชัน: 4.0 Complete*
