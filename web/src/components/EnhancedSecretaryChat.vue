<template>
  <div class="card flex flex-col h-[500px]">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4 pb-4 border-b border-slate-700">
      <div class="flex items-center gap-2">
        <span class="text-2xl">💬</span>
        <div>
          <h2 class="text-lg font-semibold">เลขาส่วนตัว</h2>
          <p class="text-xs text-slate-400">รองรับข้อความ, รูปภาพ, ไฟล์</p>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <button 
          @click="clearChat"
          class="text-slate-400 hover:text-white text-sm"
          title="ล้างแชท"
        >
          🗑️
        </button>
      </div>
    </div>

    <!-- Messages -->
    <div ref="chatContainer" class="flex-1 overflow-y-auto space-y-4 mb-4">
      <!-- Welcome -->
      <div v-if="messages.length === 0" class="text-center py-8 text-slate-500">
        <div class="text-4xl mb-4">👋</div>
        <p class="font-medium">สวัสดีค่ะ ฉันเป็นเลขาส่วนตัวของคุณ</p>
        <div class="mt-4 space-y-2 text-sm">
          <p>ส่งข้อความ, รูปภาพ, หรือไฟล์มาได้เลย</p>
          <div class="flex flex-wrap justify-center gap-2 mt-3">
            <button 
              v-for="suggestion in suggestions" 
              :key="suggestion"
              @click="sendMessage(suggestion)"
              class="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-full text-xs transition-colors"
            >
              {{ suggestion }}
            </button>
          </div>
        </div>
      </div>

      <!-- Message List -->
      <div
        v-for="(msg, index) in messages"
        :key="index"
        class="flex"
        :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div 
          class="max-w-[85%] rounded-lg p-3"
          :class="msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'"
        >
          <!-- File Attachments -->
          <div v-if="msg.files?.length" class="mb-2 space-y-2">
            <div
              v-for="file in msg.files"
              :key="file.name"
              class="flex items-center gap-2 p-2 rounded"
              :class="msg.role === 'user' ? 'bg-blue-700' : 'bg-slate-600'"
            >
              <span class="text-xl">{{ getFileIcon(file.type) }}</span>
              
              <div class="flex-1 min-w-0">
                <p class="text-sm truncate">{{ file.name }}</p>
                <p class="text-xs opacity-70">{{ formatFileSize(file.size) }}</p>
              </div>
              
              <button 
                v-if="file.preview"
                @click="openPreview(file)"
                class="text-xs px-2 py-1 rounded bg-white/20 hover:bg-white/30"
              >
                ดู
              </button>
            </div>
          </div>

          <!-- Images -->
          <div v-if="msg.images?.length" class="mb-2 grid grid-cols-2 gap-2">
            <div
              v-for="(img, i) in msg.images"
              :key="i"
              class="relative group cursor-pointer"
              @click="openImagePreview(img)"
            >
              <img 
                :src="img.url" 
                class="rounded max-h-32 object-cover w-full"
                :alt="img.name"
              />
              
              <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                <span class="text-white text-sm">🔍 ดูรูป</span>
              </div>
            </div>
          </div>

          <!-- Text Content -->
          <div v-if="msg.content" class="whitespace-pre-wrap">
            {{ msg.content }}
          </div>

          <!-- Rich Content Preview -->
          <div v-if="msg.preview" class="mt-2">
            <!-- Excel/CSV Preview -->
            <div v-if="msg.preview.type === 'spreadsheet'" class="bg-white rounded overflow-hidden"
003e
              <table class="w-full text-xs text-slate-800">
                <thead class="bg-slate-200">
                  <tr>
                    <th 
                      v-for="col in msg.preview.headers" 
                      :key="col"
                      class="px-2 py-1 text-left border-r border-slate-300"
                    >
                      {{ col }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="(row, i) in msg.preview.rows.slice(0, 5)" 
                    :key="i"
                    class="border-b border-slate-200"
                  >
                    <td 
                      v-for="(cell, j) in row" 
                      :key="j"
                      class="px-2 py-1 border-r border-slate-200"
                    >
                      {{ cell }}
                    </td>
                  </tr>
                </tbody>
              </table>
              
              <p v-if="msg.preview.rows.length > 5" class="text-center text-xs text-slate-500 py-1">
                ... และอีก {{ msg.preview.rows.length - 5 }} แถว
              </p>
            </div>

            <!-- Chart Preview -->
            <div v-if="msg.preview.type === 'chart'" class="bg-white rounded p-4">
              <div class="h-32 flex items-end justify-around gap-2">
                <div
                  v-for="(bar, i) in msg.preview.data"
                  :key="i"
                  class="flex-1 bg-blue-500 rounded-t relative group"
                  :style="{ height: `${(bar.value / msg.preview.max) * 100}%` }"
                >
                  <div class="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-slate-800 opacity-0 group-hover:opacity-100 whitespace-nowrap">
                    {{ bar.label }}: {{ bar.value }}
                  </div>
                </div>
              </div>
              
              <div class="flex justify-around mt-2 text-xs text-slate-600">
                <span v-for="(bar, i) in msg.preview.data" :key="i">{{ bar.label }}</span>
              </div>
            </div>

            <!-- Workflow/Diagram -->
            <div v-if="msg.preview.type === 'workflow'" class="bg-slate-800 rounded p-3">
              <div class="flex items-center gap-2 overflow-x-auto">
                <div
                  v-for="(step, i) in msg.preview.steps"
                  :key="i"
                  class="flex items-center gap-2"
                >
                  <div class="px-3 py-2 bg-blue-600 rounded text-sm whitespace-nowrap">
                    {{ step }}
                  </div>
                  
                  <span v-if="i < msg.preview.steps.length - 1">→</span>
                </div>
              </div>
            </div>

            <!-- PDF Preview -->
            <div v-if="msg.preview.type === 'pdf'" class="bg-slate-800 rounded p-3">
              <div class="flex items-center gap-3">
                <span class="text-3xl">📄</span>
                
                <div>
                  <p class="font-medium">{{ msg.preview.filename }}</p>
                  <p class="text-xs text-slate-400">{{ msg.preview.pages }} หน้า</p>
                </div>
                
                <button 
                  @click="openPDF(msg.preview.url)"
                  class="ml-auto btn btn-secondary text-sm"
                >
                  เปิดดู
                </button>
              </div>
              
              <!-- Extracted text preview -->
              <div v-if="msg.preview.extractedText" class="mt-2 p-2 bg-slate-900 rounded text-xs max-h-24 overflow-y-auto">
                {{ msg.preview.extractedText.slice(0, 200) }}...
              </div>
            </div>
          </div>

          <!-- Timestamp -->
          <div class="text-xs opacity-50 mt-1 text-right">
            {{ formatTime(msg.timestamp) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="border-t border-slate-700 pt-4">
      <!-- Attached Files Preview -->
      <div v-if="attachedFiles.length > 0 || attachedImages.length > 0" class="mb-3 flex flex-wrap gap-2">
        <div
          v-for="(file, i) in attachedFiles"
          :key="i"
          class="flex items-center gap-2 px-2 py-1 bg-slate-800 rounded text-sm"
        >
          <span>{{ getFileIcon(file.type) }}</span>
          <span class="truncate max-w-[100px]">{{ file.name }}</span>
          <button @click="removeFile(i)" class="text-red-400 hover:text-red-300">✕</button>
        </div>

        <div
          v-for="(img, i) in attachedImages"
          :key="`img-${i}`"
          class="relative"
        >
          <img :src="img.preview" class="h-10 w-10 object-cover rounded" />
          <button 
            @click="removeImage(i)"
            class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Input -->
      <div class="flex gap-2">
        <!-- File Upload Button -->
        <div class="relative">
          <input
            ref="fileInput"
            type="file"
            multiple
            accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.txt,.json,.js,.ts,.vue,.py"
            class="hidden"
            @change="handleFileUpload"
          />
          
          <button 
            @click="$refs.fileInput.click()"
            class="btn btn-secondary h-full"
            title="แนบไฟล์"
          >
            📎
          </button>
        </div>

        <!-- Image Upload Button -->
        <div class="relative">
          <input
            ref="imageInput"
            type="file"
            multiple
            accept="image/*"
            class="hidden"
            @change="handleImageUpload"
          />
          
          <button 
            @click="$refs.imageInput.click()"
            class="btn btn-secondary h-full"
            title="แนบรูปภาพ"
          >
            📷
          </button>
        </div>

        <!-- Text Input -->
        <textarea
          v-model="inputMessage"
          @keypress.enter.prevent="sendMessage()"
          placeholder="พิมพ์ข้อความ..."
          class="input flex-1 resize-none"
          rows="1"
          @input="autoResize"
        ></textarea>

        <!-- Send Button -->
        <button 
          @click="sendMessage()"
          :disabled="!canSend"
          class="btn btn-primary h-full"
          :class="{ 'opacity-50': !canSend }"
        >
          ส่ง
        </button>
      </div>

      <p class="text-xs text-slate-500 mt-2">
        รองรับ: ข้อความ, รูปภาพ, Excel, PDF, Word, Code files
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'

const messages = ref<any[]>([])
const inputMessage = ref('')
const attachedFiles = ref<any[]>([])
const attachedImages = ref<any[]>([])
const chatContainer = ref<HTMLDivElement | null>(null)

const suggestions = [
  'วิเคราะห์รูปนี้ให้หน่อย',
  'สรุปไฟล์ PDF นี้',
  'อ่านข้อมูล Excel นี้',
  'สร้างกราฟจากข้อมูลนี้'
]

const canSend = computed(() => {
  return inputMessage.value.trim() || 
         attachedFiles.value.length > 0 || 
         attachedImages.value.length > 0
})

const getFileIcon = (type: string) => {
  if (type.includes('excel') || type.includes('csv')) return '📊'
  if (type.includes('pdf')) return '📄'
  if (type.includes('word')) return '📝'
  if (type.includes('image')) return '🖼️'
  if (type.includes('json') || type.includes('javascript')) return '📜'
  return '📎'
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString('th-TH', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const autoResize = (e: Event) => {
  const target = e.target as HTMLTextAreaElement
  target.style.height = 'auto'
  target.style.height = target.scrollHeight + 'px'
}

const handleFileUpload = (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  if (!files) return
  
  for (const file of Array.from(files)) {
    attachedFiles.value.push({
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    })
  }
}

const handleImageUpload = (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  if (!files) return
  
  for (const file of Array.from(files)) {
    const reader = new FileReader()
    reader.onload = (e) => {
      attachedImages.value.push({
        name: file.name,
        preview: e.target?.result,
        file: file
      })
    }
    reader.readAsDataURL(file)
  }
}

const removeFile = (index: number) => {
  attachedFiles.value.splice(index, 1)
}

const removeImage = (index: number) => {
  attachedImages.value.splice(index, 1)
}

const sendMessage = async (content?: string) => {
  const text = content || inputMessage.value.trim()
  
  if (!text && attachedFiles.value.length === 0 && attachedImages.value.length === 0) {
    return
  }
  
  // Add user message
  const userMsg: any = {
    role: 'user',
    content: text,
    timestamp: new Date().toISOString()
  }
  
  if (attachedFiles.value.length > 0) {
    userMsg.files = [...attachedFiles.value]
  }
  
  if (attachedImages.value.length > 0) {
    userMsg.images = attachedImages.value.map(img => ({
      name: img.name,
      url: img.preview
    }))
  }
  
  messages.value.push(userMsg)
  
  // Clear input
  inputMessage.value = ''
  attachedFiles.value = []
  attachedImages.value = []
  
  // Scroll to bottom
  await nextTick()
  chatContainer.value?.scrollTo({ top: chatContainer.value.scrollHeight, behavior: 'smooth' })
  
  // Simulate AI response with rich preview
  setTimeout(() => {
    const aiMsg: any = {
      role: 'assistant',
      content: generateAIResponse(text, userMsg.files, userMsg.images),
      timestamp: new Date().toISOString()
    }
    
    // Add preview based on file type
    if (userMsg.files?.some((f: any) => f.name.endsWith('.xlsx'))) {
      aiMsg.preview = {
        type: 'spreadsheet',
        headers: ['Name', 'Age', 'City'],
        rows: [
          ['John', '30', 'NY'],
          ['Jane', '25', 'LA'],
          ['Bob', '35', 'Chicago']
        ]
      }
    }
    
    if (text?.includes('กราฟ') || text?.includes('chart')) {
      aiMsg.preview = {
        type: 'chart',
        data: [
          { label: 'Jan', value: 65 },
          { label: 'Feb', value: 80 },
          { label: 'Mar', value: 45 },
          { label: 'Apr', value: 90 }
        ],
        max: 100
      }
    }
    
    messages.value.push(aiMsg)
    
    nextTick(() => {
      chatContainer.value?.scrollTo({ top: chatContainer.value.scrollHeight, behavior: 'smooth' })
    })
  }, 1000)
}

const generateAIResponse = (text: string, files?: any[], images?: any[]) => {
  if (images?.length) {
    return 'ฉันเห็นรูปภาพที่คุณส่งมาแล้วค่ะ นี่คือการวิเคราะห์:\n\n• รูปนี้แสดง...\n• สามารถนำไปใช้...\n\nต้องการให้ช่วยอะไรเพิ่มเติมไหมคะ?'
  }
  
  if (files?.some((f: any) => f.name.endsWith('.xlsx'))) {
    return 'ฉันอ่านไฟล์ Excel แล้วค่ะ พบข้อมูลดังนี้:\n\n• จำนวนแถว: 1,234 แถว\n• จำนวนคอลัมน์: 8 คอลัมน์\n• ข้อมูลครอบคลุม: 2020-2024\n\nดูตัวอย่างข้อมูลด้านบนได้เลยค่ะ'
  }
  
  if (files?.some((f: any) => f.name.endsWith('.pdf'))) {
    return 'สรุปเนื้อหาจาก PDF:\n\n1. บทนำ: อธิบายเกี่ยวกับ...\n2. วิธีการ: ใช้แนวทาง...\n3. ผลลัพธ์: พบว่า...\n\nต้องการให้อธิบายส่วนไหนเพิ่มเติมไหมคะ?'
  }
  
  return `เข้าใจค่ะ "${text}"\n\nฉันสามารถช่วยคุณได้ ลองส่งไฟล์หรือรูปภาพมาได้เลยค่ะ`
}

const clearChat = () => {
  if (confirm('ต้องการล้างแชททั้งหมด?')) {
    messages.value = []
  }
}

const openPreview = (file: any) => {
  console.log('Open preview:', file)
}

const openImagePreview = (img: any) => {
  console.log('Open image:', img)
}

const openPDF = (url: string) => {
  window.open(url, '_blank')
}
</script>
