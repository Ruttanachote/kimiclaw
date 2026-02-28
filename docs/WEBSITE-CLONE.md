# Website Clone Feature

## 🌐 ฟีเจอร์ใหม่: Clone Website

แค่แปะลิงก์เว็บ → AI วิเคราะห์ → Clone UI มาให้

---

## 📝 วิธีใช้

### 1. เปิด Clone Website
```
🤖 Secretary: สวัสดีค่ะ! มีอะไรให้ช่วยไหมคะ?

👤 User: ช่วย clone เว็บนี้หน่อย https://stripe.com

🤖 Secretary: ได้ค่ะ! เปิด Website Clone ให้เลย
```

### 2. แปะ URL แล้วกด Clone
```
[🌐 Website Clone]

URL: [https://stripe.com        ] [🚀 Clone Website]

Framework: [Vue 3 ▼]    Style: [Tailwind CSS ▼]
```

### 3. AI ทำงาน
```
⏳ กำลัง Clone...

○ Fetch website        → ✓ ดึง HTML สำเร็จ
○ Parse structure      → ✓ พบ 8 sections
○ Extract styles       → ✓ ดึง CSS สำเร็จ  
○ Analyze with AI      → ✓ วิเคราะห์เสร็จ
○ Generate clone       → ✓ สร้างโค้ดเสร็จ
```

### 4. ได้ผลลัพธ์
```
✅ Clone สำเร็จ!

📊 Analysis:
   - Page Type: landing
   - Sections: 8 (Hero, Features, Pricing, etc.)
   - Colors: #635BFF, #0A2540, #00D4AA...
   - Fonts: Inter, system-ui

👁️ Preview: [แสดงตัวอย่าง]

📦 Export:
   [⚛️ Vue 3] [⚛️ React] [📄 HTML] [🎨 CSS]
```

---

## 🎯 สิ่งที่ AI ทำ

### Step 1: Fetch Website
- ดึง HTML จาก URL
- ตาม redirects
- Handle errors

### Step 2: Parse Structure
```javascript
structure = {
  title: 'Stripe | Payment Processing Platform',
  description: '...',
  pageType: 'landing',
  sections: [
    { tag: 'header', className: 'Header', text: '...' },
    { tag: 'section', className: 'Hero', text: '...' }
  ],
  colors: ['#635BFF', '#0A2540', '#00D4AA'],
  fonts: ['Inter', 'system-ui']
}
```

### Step 3: Extract Styles
- ดึง CSS จาก link tags
- หา CSS Variables
- หา Color palette

### Step 4: Analyze with AI
```json
{
  "layout": { "type": "landing", "header": "fixed" },
  "colors": { "primary": "#635BFF", "background": "#FFFFFF" },
  "typography": { "headingFont": "Inter", "baseSize": "16px" },
  "components": ["Button", "Card", "Navigation"]
}
```

### Step 5: Generate Clone
สร้างโค้ด Vue 3, React หรือ HTML

---

## 📁 ไฟล์ที่สร้าง

```
src/
├── views/
│   ├── Home.vue
│   ├── Products.vue
│   └── Solutions.vue
├── components/
│   ├── AppHeader.vue
│   ├── HeroSection.vue
│   └── FeatureCard.vue
└── styles/
    └── variables.css
```

---

## 🔧 API

```http
POST /api/agents/clone
{
  "url": "https://example.com",
  "options": { "framework": "vue", "style": "tailwind" }
}
```
