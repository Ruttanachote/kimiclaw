<template>
  <div class="min-h-screen bg-slate-950 p-6">
    <!-- Header -->
    <div class="max-w-7xl mx-auto mb-6">
      <div class="flex items-center gap-3">
        <span class="text-4xl">🧪</span>
        <div>
          <h1 class="text-2xl font-bold">AI Visual Tester</h1>
          <p class="text-slate-400">AI เทสเว็บให้เอง ดู preview หลายอุปกรณ์ วิเคราะห์ responsive</p>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto">
      <!-- URL Input -->
      <div class="card mb-6">
        <div class="flex gap-4">
          <div class="flex-1">
            <input
              v-model="url"
              type="url"
              placeholder="https://your-website.com"
              class="input w-full"
              @keyup.enter="startTest"
            />
          </div>
          
          <button
            @click="startTest"
            :disabled="!isValidUrl || testing"
            class="btn btn-primary px-8"
            :class="{ 'opacity-50': !isValidUrl || testing }"
          >
            {{ testing ? '⏳ Testing...' : '🧪 Start Test' }}
          </button>
        </div>

        <!-- Options -->
        <div class="mt-4 flex flex-wrap gap-4">
          <div>
            <label class="block text-sm text-slate-400 mb-2">Devices</label>
            <div class="flex gap-2">
              <button
                v-for="device in availableDevices"
                :key="device.id"
                @click="toggleDevice(device.id)"
                class="px-3 py-1 rounded-lg text-sm transition-colors"
                :class="selectedDevices.includes(device.id) 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-800 text-slate-400'"
              >
                {{ device.icon }} {{ device.name }}
              </button>
            </div>
          </div>

          <div class="flex items-center gap-4"
          >
            <label class="flex items-center gap-2 cursor-pointer"
            >
              <input 
                type="checkbox" 
                v-model="options.aiAnalysis"
                class="rounded bg-slate-800"
              />
              <span class="text-sm">🤖 AI Analysis</span>
            </label>
            
            <label class="flex items-center gap-2 cursor-pointer"
            >
              <input 
                type="checkbox" 
                v-model="options.recordVideo"
                class="rounded bg-slate-800"
              />
              <span class="text-sm">🎥 Record Video</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Live Testing Progress -->
      <div v-if="testing" class="card mb-6 border-2 border-blue-600">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold flex items-center gap-2">
            <span class="animate-pulse">🤖</span>
            AI กำลังทดสอบ...
          </h3>
          
          <span class="text-sm text-slate-400">{{ progress }}%</span>
        </div>

        <!-- Progress Bar -->
        <div class="h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
          <div 
            class="h-full bg-blue-600 transition-all duration-500"
            :style="{ width: progress + '%' }"
          ></div>
        </div>

        <!-- Live Steps -->
        <div class="space-y-2">
          <div
            v-for="(step, i) in testSteps"
            :key="i"
            class="flex items-center gap-3 p-2 rounded"
            :class="getStepBg(step.status)"
          >
            <span class="text-lg">{{ getStepIcon(step.status) }}</span>
            <span :class="step.status === 'pending' ? 'text-slate-500' : ''">
              {{ step.name }}
            </span>
            
            <span v-if="step.detail" class="text-xs text-slate-400 ml-auto">
              {{ step.detail }}
            </span>
          </div>
        </div>

        <!-- Live Preview (if available) -->
        <div v-if="currentScreenshot" class="mt-4">
          <p class="text-sm text-slate-400 mb-2">👁️ Live Preview: {{ currentDevice }}</p>
          <img 
            :src="currentScreenshot" 
            class="w-full max-h-64 object-contain bg-slate-900 rounded-lg"
          />
        </div>
      </div>

      <!-- Results -->
      <div v-if="result" class="space-y-6">
        <!-- Summary -->
        <div class="card">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div 
                class="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold"
                :class="getScoreClass(result.summary.overallScore)"
              >
                {{ result.summary.overallScore }}
              </div>
              
              <div>
                <h3 class="font-semibold text-lg">Test Complete</h3>
                <p class="text-slate-400">
                  {{ result.summary.passed }} passed, {{ result.summary.failed }} failed
                </p>
                
                <div class="flex gap-2 mt-2">
                  <span 
                    class="text-xs px-2 py-1 rounded"
                    :class="getAssessmentClass(result.summary.assessment)"
                  >
                    {{ result.summary.assessment }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="flex gap-2">
              <button @click="downloadReport" class="btn btn-secondary">
                📥 Download Report
              </button>
            </div>
          </div>
        </div>

        <!-- Device Previews -->
        <div class="card">
          <h3 class="font-semibold mb-4">📱 Device Previews</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              v-for="(deviceResult, deviceName) in result.devices"
              :key="deviceName"
              class="bg-slate-800 rounded-lg overflow-hidden"
            >
              <!-- Device Header -->
              <div class="p-3 border-b border-slate-700 flex items-center justify-between"
003e
                <span class="font-medium">{{ getDeviceIcon(deviceName) }} {{ deviceName }}</span>
                
                <span 
                  class="text-xs px-2 py-1 rounded"
                  :class="deviceResult.passed ? 'bg-green-600' : 'bg-red-600'"
                >
                  {{ deviceResult.passed ? 'PASS' : 'FAIL' }}
                </span>
              </div>
              
              <!-- Screenshot -->
              <div class="aspect-[9/16] bg-slate-900 relative">
                <img
                  v-if="deviceResult.screenshots?.viewport"
                  :src="deviceResult.screenshots.viewport"
                  class="w-full h-full object-cover"
                />
                
                <div v-else class="flex items-center justify-center h-full text-slate-500">
                  No screenshot
                </div>
              </div>
              
              <!-- Quick Stats -->
              <div class="p-3 space-y-1 text-sm">
                <div class="flex justify-between">
                  <span class="text-slate-400">Load Time</span>
                  <span :class="getLoadTimeClass(deviceResult.metrics.loadTime)">
                    {{ deviceResult.metrics.loadTime }}ms
                  </span>
                </div>
                
                <div class="flex justify-between">
                  <span class="text-slate-400">Accessibility</span>
                  <span>{{ deviceResult.accessibility.score }}/100</span>
                </div>
                
                <div class="flex justify-between">
                  <span class="text-slate-400">Responsive</span>
                  <span :class="deviceResult.responsive.passed ? 'text-green-400' : 'text-red-400'">
                    {{ deviceResult.responsive.passed ? '✓' : '✗' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- AI Analysis -->
        <div v-if="result.aiAnalysis" class="card bg-purple-900/20 border-purple-700">
          <div class="flex items-center gap-3 mb-4">
            <span class="text-2xl">🤖</span>
            <h3 class="font-semibold">AI Analysis</h3>
          </div>
          
          <div v-if="result.aiAnalysis.criticalIssues?.length" class="mb-4">
            <h4 class="text-red-400 font-medium mb-2">⚠️ Critical Issues</h4>
            
            <ul class="space-y-1">
              <li 
                v-for="issue in result.aiAnalysis.criticalIssues" 
                :key="issue"
                class="text-sm"
              >
                • {{ issue }}
              </li>
            </ul>
          </div>
          
          <div v-if="result.aiAnalysis.recommendations?.length">
            <h4 class="text-blue-400 font-medium mb-2">💡 Recommendations</h4>
            
            <ul class="space-y-1">
              <li 
                v-for="rec in result.aiAnalysis.recommendations" 
                :key="rec"
                class="text-sm"
              >
                • {{ rec }}
              </li>
            </ul>
          </div>
        </div>

        <!-- Recommendations -->
        <div v-if="result.recommendations?.length" class="card">
          <h3 class="font-semibold mb-4">🔧 Priority Fixes</h3>
          
          <div class="space-y-3">
            <div
              v-for="rec in result.recommendations"
              :key="rec.issue"
              class="p-3 rounded-lg"
              :class="getPriorityClass(rec.priority)"
            >
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs px-2 py-0.5 rounded bg-slate-800">
                  {{ rec.priority }}
                </span>
                
                <span class="text-xs px-2 py-0.5 rounded bg-slate-800">
                  {{ rec.category }}
                </span>
              </div>
              
              <p class="font-medium">{{ rec.issue }}</p>
              
              <p class="text-sm text-slate-400">{{ rec.suggestion }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const url = ref('')
const testing = ref(false)
const progress = ref(0)
const result = ref<any>(null)
const currentScreenshot = ref('')
const currentDevice = ref('')

const availableDevices = [
  { id: 'desktop', name: 'Desktop', icon: '🖥️' },
  { id: 'tablet', name: 'Tablet', icon: '📱' },
  { id: 'mobile', name: 'Mobile', icon: '📱' }
]

const selectedDevices = ref(['desktop', 'tablet', 'mobile'])

const options = ref({
  aiAnalysis: true,
  recordVideo: false
})

const testSteps = ref([
  { name: 'Launch browsers', status: 'pending', detail: '' },
  { name: 'Test Desktop', status: 'pending', detail: '' },
  { name: 'Test Tablet', status: 'pending', detail: '' },
  { name: 'Test Mobile', status: 'pending', detail: '' },
  { name: 'AI Analysis', status: 'pending', detail: '' },
  { name: 'Generate report', status: 'pending', detail: '' }
])

const isValidUrl = computed(() => {
  try {
    new URL(url.value)
    return true
  } catch {
    return false
  }
})

const toggleDevice = (deviceId: string) => {
  const index = selectedDevices.value.indexOf(deviceId)
  if (index > -1) {
    selectedDevices.value.splice(index, 1)
  } else {
    selectedDevices.value.push(deviceId)
  }
}

const getStepIcon = (status: string) => {
  const icons: Record<string, string> = {
    pending: '○',
    processing: '◐',
    complete: '✓',
    error: '✗'
  }
  return icons[status] || '○'
}

const getStepBg = (status: string) => {
  const classes: Record<string, string> = {
    pending: '',
    processing: 'bg-blue-900/30',
    complete: 'bg-green-900/30',
    error: 'bg-red-900/30'
  }
  return classes[status] || ''
}

const getScoreClass = (score: number) => {
  if (score >= 90) return 'bg-green-600 text-white'
  if (score >= 70) return 'bg-yellow-600 text-white'
  return 'bg-red-600 text-white'
}

const getAssessmentClass = (assessment: string) => {
  const classes: Record<string, string> = {
    excellent: 'bg-green-600',
    good: 'bg-blue-600',
    'needs-work': 'bg-yellow-600',
    critical: 'bg-red-600'
  }
  return classes[assessment] || 'bg-slate-600'
}

const getDeviceIcon = (device: string) => {
  const icons: Record<string, string> = {
    desktop: '🖥️',
    tablet: '📱',
    mobile: '📱'
  }
  return icons[device] || '📱'
}

const getLoadTimeClass = (time: number) => {
  if (time < 1000) return 'text-green-400'
  if (time < 3000) return 'text-yellow-400'
  return 'text-red-400'
}

const getPriorityClass = (priority: string) => {
  const classes: Record<string, string> = {
    high: 'bg-red-900/30 border border-red-700',
    medium: 'bg-yellow-900/30 border border-yellow-700',
    low: 'bg-blue-900/30 border border-blue-700'
  }
  return classes[priority] || 'bg-slate-800'
}

const startTest = async () => {
  if (!isValidUrl.value || selectedDevices.value.length === 0) return
  
  testing.value = true
  progress.value = 0
  result.value = null
  
  // Reset steps
  testSteps.value.forEach(s => { s.status = 'pending'; s.detail = '' })
  
  try {
    const res = await fetch('/api/agents/visual-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url.value,
        options: {
          devices: selectedDevices.value,
          ...options.value
        }
      })
    })
    
    if (!res.ok) throw new Error('Test failed')
    
    result.value = await res.json()
    
    // Mark all steps complete
    testSteps.value.forEach(s => s.status = 'complete')
    progress.value = 100
    
  } catch (err) {
    testSteps.value.find(s => s.status === 'processing')!.status = 'error'
  } finally {
    testing.value = false
  }
}

const downloadReport = () => {
  const blob = new Blob([JSON.stringify(result.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `test-report-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
