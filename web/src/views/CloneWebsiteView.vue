<template>
  <div class="min-h-screen bg-slate-950 p-6">
    <!-- Header -->
    <div class="max-w-4xl mx-auto mb-8">
      <div class="flex items-center gap-3 mb-4">
        <span class="text-4xl">🌐</span>
        <div>
          <h1 class="text-2xl font-bold">Website Clone</h1>
          <p class="text-slate-400">แปะลิงก์เว็บ AI จะ clone UI มาให้</p>
        </div>
      </div>
    </div>

    <div class="max-w-4xl mx-auto">
      <!-- URL Input -->
      <div class="card mb-6">
        <div class="flex gap-4">
          <div class="flex-1">
            <input
              v-model="url"
              type="url"
              placeholder="https://example.com"
              class="input w-full"
              @keyup.enter="startClone"
            />
            <p class="text-xs text-slate-500 mt-2">
              💡 ใส่ URL เว็บที่ต้องการ clone แล้วกด Clone
            </p>
          </div>
          
          <button
            @click="startClone"
            :disabled="!isValidUrl || cloning"
            class="btn btn-primary px-8"
            :class="{ 'opacity-50': !isValidUrl || cloning }"
          >
            {{ cloning ? '⏳ Cloning...' : '🚀 Clone Website' }}
          </button>
        </div>

        <!-- Options -->
        <div class="mt-4 flex gap-4">
          <div>
            <label class="block text-sm text-slate-400 mb-1">Framework</label>
            <select v-model="options.framework" class="input"
            >
              <option value="vue">Vue 3</option>
              <option value="react">React</option>
              <option value="html">HTML/CSS</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm text-slate-400 mb-1">Style</label>
            <select v-model="options.style" class="input"
            >
              <option value="tailwind">Tailwind CSS</option>
              <option value="css">Plain CSS</option>
              <option value="scss">SCSS</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Progress -->
      <div v-if="cloning" class="card mb-6"
003e
        <h3 class="font-semibold mb-4">กำลัง Clone...</h3>
        
        <div class="space-y-3"
        >
          <div
            v-for="(step, i) in steps"
            :key="i"
            class="flex items-center gap-3"
          >
            <span
              class="text-xl"
              :class="getStepIconClass(step.status)"
            >
              {{ getStepIcon(step.status) }}
            </span>
            
            <span :class="step.status === 'pending' ? 'text-slate-500' : ''">
              {{ step.name }}
            </span>
            
            <span v-if="step.detail" class="text-xs text-slate-400">
              {{ step.detail }}
            </span>
          </div>
        </div>
      </div>

      <!-- Result -->
      <div v-if="result" class="space-y-6">
        <!-- Success Message -->
        <div class="card bg-green-900/20 border-green-700">
          <div class="flex items-center gap-3">
            <span class="text-3xl">✅</span>
            <div>
              <h3 class="font-semibold text-green-400">Clone สำเร็จ!</h3>
              <p class="text-sm text-slate-300">
                วิเคราะห์ {{ result.analysis?.layout?.type || 'website' }} 
                พบ {{ result.analysis?.sections?.length || 0 }} sections
              </p>
            </div>
          </div>
        </div>

        <!-- Preview -->
        <div class="card"
        >
          <div class="flex items-center justify-between mb-4"
          >
            <h3 class="font-semibold">👁️ Preview</h3>
            
            <button @click="showPreview = !showPreview" class="btn btn-secondary text-sm"
            >
              {{ showPreview ? 'Hide' : 'Show' }}
            </button>
          </div>
          
          <iframe
            v-if="showPreview"
            :srcdoc="result.preview"
            class="w-full h-96 border-0 rounded-lg bg-white"
          ></iframe>
        </div>

        <!-- Analysis -->
        <div class="card">
          <h3 class="font-semibold mb-4">📊 Analysis</h3>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-slate-400">Page Type</p>
              <p class="font-medium">{{ result.analysis?.layout?.type || 'Unknown' }}</p>
            </div>
            
            <div>
              <p class="text-sm text-slate-400">Sections</p>
              <p class="font-medium">{{ result.analysis?.sections?.length || 0 }}</p>
            </div>
            
            <div>
              <p class="text-sm text-slate-400">Colors Detected</p>
              <div class="flex gap-1 mt-1">
                <div
                  v-for="color in result.analysis?.colors?.slice(0, 5)"
                  :key="color"
                  class="w-6 h-6 rounded"
                  :style="{ backgroundColor: color }"
                  :title="color"
                ></div>
              </div>
            </div>
            
            <div>
              <p class="text-sm text-slate-400">Fonts</p>
              <p class="font-medium">{{ result.analysis?.fonts?.[0] || 'System' }}</p>
            </div>
          </div>
        </div>

        <!-- Export Options -->
        <div class="card">
          <h3 class="font-semibold mb-4">📦 Export Code</h3>
          
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              v-for="format in exportFormats"
              :key="format.id"
              @click="exportCode(format.id)"
              class="btn btn-secondary text-center"
            >
              <div class="text-2xl mb-1">{{ format.icon }}</div>
              <div class="text-sm">{{ format.name }}</div>
            </button>
          </div>
        </div>

        <!-- Generated Files -->
        <div v-if="showFiles" class="card">
          <h3 class="font-semibold mb-4">📁 Generated Files</h3>
          
          <div class="space-y-2">
            <div
              v-for="file in generatedFiles"
              :key="file.path"
              class="flex items-center justify-between p-3 bg-slate-800 rounded-lg"
            >
              <span class="font-mono text-sm">{{ file.path }}</span>
              
              <button
                @click="downloadFile(file)"
                class="text-blue-400 hover:text-blue-300"
              >
                ⬇️
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="card bg-red-900/20 border-red-700">
        <div class="flex items-center gap-3">
          <span class="text-3xl">❌</span>
          <div>
            <h3 class="font-semibold text-red-400">Clone ไม่สำเร็จ</h3>
            <p class="text-sm">{{ error }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const url = ref('')
const cloning = ref(false)
const error = ref('')
const result = ref<any>(null)
const showPreview = ref(true)
const showFiles = ref(true)

const options = ref({
  framework: 'vue',
  style: 'tailwind'
})

const steps = ref([
  { name: 'Fetch website', status: 'pending', detail: '' },
  { name: 'Parse structure', status: 'pending', detail: '' },
  { name: 'Extract styles', status: 'pending', detail: '' },
  { name: 'Analyze with AI', status: 'pending', detail: '' },
  { name: 'Generate clone', status: 'pending', detail: '' }
])

const exportFormats = [
  { id: 'vue', name: 'Vue 3', icon: '⚛️' },
  { id: 'react', name: 'React', icon: '⚛️' },
  { id: 'html', name: 'HTML', icon: '📄' },
  { id: 'css', name: 'CSS', icon: '🎨' }
]

const generatedFiles = ref<any[]>([])

const isValidUrl = computed(() => {
  try {
    new URL(url.value)
    return true
  } catch {
    return false
  }
})

const getStepIcon = (status: string) => {
  const icons: Record<string, string> = {
    pending: '○',
    processing: '◐',
    complete: '✓',
    error: '✗'
  }
  return icons[status] || '○'
}

const getStepIconClass = (status: string) => {
  const classes: Record<string, string> = {
    pending: 'text-slate-500',
    processing: 'text-blue-400',
    complete: 'text-green-400',
    error: 'text-red-400'
  }
  return classes[status] || 'text-slate-500'
}

const startClone = async () => {
  if (!isValidUrl.value) return
  
  cloning.value = true
  error.value = ''
  result.value = null
  
  // Reset steps
  steps.value.forEach(s => { s.status = 'pending'; s.detail = '' })
  
  try {
    const res = await fetch('/api/agents/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url.value,
        options: options.value
      })
    })
    
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Clone failed')
    }
    
    result.value = await res.json()
    
    // Update steps as complete
    steps.value.forEach(s => s.status = 'complete')
    
    // Load generated files
    if (result.value.export?.vue?.files) {
      generatedFiles.value = result.value.export.vue.files
    }
    
  } catch (err: any) {
    error.value = err.message
    steps.value.find(s => s.status === 'processing')!.status = 'error'
  } finally {
    cloning.value = false
  }
}

const exportCode = (format: string) => {
  console.log('Export to:', format)
  // Download logic here
}

const downloadFile = (file: any) => {
  const blob = new Blob([file.content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.path.split('/').pop() || 'file'
  a.click()
  URL.revokeObjectURL(url)
}
</script>
