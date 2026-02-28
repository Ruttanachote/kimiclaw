<template>
  <div class="min-h-screen bg-slate-950 p-6">
    <!-- Header -->
    <div class="max-w-7xl mx-auto mb-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-3xl">🎨</span>
          <div>
            <h1 class="text-2xl font-bold">UI/UX Studio</h1>
            <p class="text-slate-400">Design, wireframe, and prototype</p>
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <button @click="activeTab = 'wireframe'" 
            :class="activeTab === 'wireframe' ? 'btn btn-primary' : 'btn btn-secondary'"
          >
            📐 Wireframe
          </button>
          
          <button @click="activeTab = 'designsystem'"
            :class="activeTab === 'designsystem' ? 'btn btn-primary' : 'btn btn-secondary'"
          >
            🎨 Design System
          </button>
          
          <button @click="activeTab = 'components'"
            :class="activeTab === 'components' ? 'btn btn-primary' : 'btn btn-secondary'"
          >
            🧩 Components
          </button>
          
          <button @click="activeTab = 'accessibility'"
            :class="activeTab === 'accessibility' ? 'btn btn-primary' : 'btn btn-secondary'"
          >
            ♿ A11y Check
          </button>
        </div>
      </div>
    </div>

    <!-- Wireframe Tab -->
    <div v-if="activeTab === 'wireframe'" class="max-w-7xl mx-auto">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Input Panel -->
        <div class="card">
          <h2 class="font-semibold mb-4">Generate Wireframe</h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-slate-400 mb-1">Project Name</label>
              <input v-model="wireframeConfig.title" class="input" placeholder="My Awesome App" />
            </div>
            
            <div>
              <label class="block text-sm text-slate-400 mb-1">Description</label>
              <textarea 
                v-model="wireframeConfig.description"
                class="input h-24 resize-none"
                placeholder="Describe what you're building..."
              ></textarea>
            </div>
            
            <div>
              <label class="block text-sm text-slate-400 mb-1">Page Type</label>
              <select v-model="wireframeConfig.type" class="input">
                <option value="landing">Landing Page</option>
                <option value="dashboard">Dashboard</option>
                <option value="ecommerce">E-commerce</option>
                <option value="form">Form/Login</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm text-slate-400 mb-1">Pages Needed</label>
              <div class="space-y-2">
                <label v-for="page in pageOptions" :key="page" class="flex items-center gap-2"
                >
                  <input 
                    type="checkbox" 
                    :value="page"
                    v-model="wireframeConfig.pages"
                    class="rounded bg-slate-800 border-slate-600"
                  />
                  <span class="text-sm">{{ page }}</span>
                </label>
              </div>
            </div>
            
            <button 
              @click="generateWireframe"
              :disabled="generating"
              class="btn btn-primary w-full"
            >
              {{ generating ? 'Generating...' : '🚀 Generate Wireframe' }}
            </button>
          </div>
        </div>

        <!-- Preview Panel -->
        <div class="lg:col-span-2">
          <div v-if="!wireframeResult" class="card h-96 flex items-center justify-center">
            <div class="text-center text-slate-500">
              <span class="text-4xl">📐</span>
              <p class="mt-2">Your wireframe will appear here</p>
            </div>
          </div>
          
          <div v-else class="card">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold">{{ wireframeResult.title }}</h3>
              
              <div class="flex gap-2">
                <button @click="exportWireframe('html')" class="btn btn-secondary text-sm">
                  📄 HTML
                </button>
                
                <button @click="exportWireframe('figma')" class="btn btn-secondary text-sm"
003e
                  🎨 Figma
                </button>
              </div>
            </div>
            
            <!-- Wireframe Preview -->
            <div class="bg-white rounded-lg p-6 overflow-auto max-h-[600px]">
              <div v-for="page in wireframeResult.pages" :key="page.id" class="mb-8">
                <h4 class="text-slate-800 font-medium mb-4">{{ page.name }}</h4>
                
                <div class="border-2 border-dashed border-slate-300 rounded-lg p-4"
                >
                  <div v-for="section in page.sections" :key="section.id" class="mb-4"
                  >
                    <div class="bg-slate-100 rounded p-4 text-center text-slate-500"
                    >
                      {{ section.name }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Design System Tab -->
    <div v-if="activeTab === 'designsystem'" class="max-w-7xl mx-auto">
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <!-- Config Panel -->
        <div class="card">
          <h2 class="font-semibold mb-4">Design System</h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-slate-400 mb-1">Name</label>
              <input v-model="dsConfig.name" class="input" placeholder="My Design System" />
            </div>
            
            <div>
              <label class="block text-sm text-slate-400 mb-1">Primary Color</label>
              <select v-model="dsConfig.theme" class="input">
                <option value="blue">🔵 Blue</option>
                <option value="emerald">🟢 Emerald</option>
                <option value="violet">🟣 Violet</option>
                <option value="rose">🔴 Rose</option>
              </select>
            </div>
            
            <button 
              @click="generateDesignSystem"
              :disabled="generatingDS"
              class="btn btn-primary w-full"
            >
              {{ generatingDS ? 'Generating...' : '🎨 Generate' }}
            </button>
          </div>
        </div>

        <!-- Preview -->
        <div class="lg:col-span-3">
          <div v-if="designSystem" class="space-y-6">
            <!-- Colors -->
            <div class="card">
              <h3 class="font-semibold mb-4">Colors</h3>
              
              <div class="space-y-4">
                <div>
                  <p class="text-sm text-slate-400 mb-2">Primary</p>
                  <div class="flex gap-2">
                    <div
                      v-for="(color, shade) in designSystem.foundations.colors.primary"
                      :key="shade"
                      class="w-12 h-12 rounded-lg shadow-lg"
                      :style="{ backgroundColor: color }"
                      :title="`${shade}: ${color}`"
                    ></div>
                  </div>
                </div>
                
                <div>
                  <p class="text-sm text-slate-400 mb-2">Semantic</p>
                  <div class="flex gap-4">
                    <div
                      v-for="(color, name) in designSystem.foundations.colors.semantic"
                      :key="name"
                      class="px-4 py-2 rounded-lg text-sm font-medium"
                      :style="{ backgroundColor: color.DEFAULT, color: 'white' }"
                    >
                      {{ name }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Typography -->
            <div class="card">
              <h3 class="font-semibold mb-4">Typography</h3>
              
              <div class="space-y-2">
                <div v-for="(size, name) in designSystem.foundations.typography.sizes" :key="name"
                >
                  <p :style="{ fontSize: size.size, lineHeight: size.lineHeight }">
                    {{ name }} - The quick brown fox
                  </p>
                </div>
              </div>
            </div>

            <!-- Export -->
            <div class="card">
              <h3 class="font-semibold mb-4">Export</h3>
              
              <div class="flex gap-2">
                <button @click="exportDS('css')" class="btn btn-secondary">
                  📝 CSS
                </button>
                
                <button @click="exportDS('scss')" class="btn btn-secondary"
003e
                  📝 SCSS
                </button>
                
                <button @click="exportDS('tailwind')" class="btn btn-secondary"
                >
                  🎨 Tailwind
                </button>
                
                <button @click="exportDS('json')" class="btn btn-secondary"
                >
                  📦 JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Components Tab -->
    <div v-if="activeTab === 'components'" class="max-w-7xl mx-auto">
      <div class="card">
        <h2 class="font-semibold mb-4">Component Library</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="(components, category) in componentLibrary"
            :key="category"
            class="bg-slate-800 rounded-lg p-4"
          >
            <h3 class="font-medium mb-3 capitalize">{{ category }}</h3>
            
            <div class="space-y-2">
              <div
                v-for="comp in components"
                :key="comp.name"
                class="flex items-center justify-between p-2 bg-slate-700 rounded"
              >
                <span class="text-sm">{{ comp.name }}</span>
                
                <span class="text-xs text-slate-400">
                  {{ comp.states?.length || comp.variants?.length || 0 }} variants
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Accessibility Tab -->
    <div v-if="activeTab === 'accessibility'" class="max-w-7xl mx-auto">
      <div class="card">
        <h2 class="font-semibold mb-4">Accessibility Checker</h2>
        
        <div class="space-y-4">
          <div class="flex items-center gap-4">
            <input 
              type="file" 
              accept=".json,.fig"
              @change="uploadDesign"
              class="hidden"
              ref="fileInput"
            />
            
            <button @click="$refs.fileInput.click()" class="btn btn-secondary">
              📁 Upload Design
            </button>
            
            
            <span v-if="uploadedFile" class="text-sm text-slate-400">
              {{ uploadedFile.name }}
            </span>
          </div>
          
          <button 
            @click="checkAccessibility"
            :disabled="!uploadedFile || checking"
            class="btn btn-primary"
          >
            {{ checking ? 'Checking...' : '♿ Run Accessibility Check' }}
          </button>
        </div>

        <!-- Results -->
        <div v-if="a11yResults" class="mt-6">
          <!-- Score -->
          <div class="flex items-center gap-4 mb-6">
            <div 
              class="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold"
              :class="getScoreClass(a11yResults.score)"
            >
              {{ a11yResults.score }}
            </div>
            
            <div>
              <p class="font-medium">Accessibility Score</p>
              
              <div class="flex gap-2 mt-1">
                <span 
                  v-if="a11yResults.wcag.aa"
                  class="bg-green-600 text-xs px-2 py-1 rounded"
                >
                  WCAG AA ✓
                </span>
                
                <span 
                  v-if="a11yResults.wcag.aaa"
                  class="bg-green-600 text-xs px-2 py-1 rounded"
                >
                  WCAG AAA ✓
                </span>
              </div>
            </div>
          </div>

          <!-- Passed -->
          <div v-if="a11yResults.passed.length > 0" class="mb-4">
            <h3 class="font-medium text-green-400 mb-2">✓ Passed ({{ a11yResults.passed.length }})</h3>
            
            <div class="space-y-1">
              <div
                v-for="item in a11yResults.passed"
                :key="item"
                class="text-sm text-slate-300"
              >
                {{ item }}
              </div>
            </div>
          </div>

          <!-- Issues -->
          <div v-if="a11yResults.issues.length > 0">
            <h3 class="font-medium text-red-400 mb-2">⚠ Issues ({{ a11yResults.issues.length }})</h3>
            
            <div class="space-y-2">
              <div
                v-for="issue in a11yResults.issues"
                :key="issue.type"
                class="p-3 bg-red-900/30 border border-red-700 rounded-lg"
              >
                <div class="flex items-center gap-2">
                  <span 
                    class="text-xs px-2 py-0.5 rounded"
                    :class="issue.severity === 'error' ? 'bg-red-600' : 'bg-yellow-600'"
                  >
                    {{ issue.severity }}
                  </span>
                  
                  <span class="font-medium">{{ issue.message }}</span>
                </div>
                
                <p v-if="issue.details" class="text-sm text-slate-400 mt-1">
                  {{ issue.details }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const activeTab = ref('wireframe')
const generating = ref(false)
const generatingDS = ref(false)
const checking = ref(false)

// Wireframe
const wireframeConfig = ref({
  title: '',
  description: '',
  type: 'landing',
  pages: ['Home']
})

const pageOptions = ['Home', 'About', 'Contact', 'Dashboard', 'Login', 'Register']
const wireframeResult = ref<any>(null)

// Design System
const dsConfig = ref({
  name: '',
  theme: 'blue'
})

const designSystem = ref<any>(null)

// Components
const componentLibrary = ref({})

// Accessibility
const uploadedFile = ref<File | null>(null)
const a11yResults = ref<any>(null)

const generateWireframe = async () => {
  generating.value = true
  
  try {
    const res = await fetch('/api/agents/uiux/wireframe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wireframeConfig.value)
    })
    
    if (res.ok) {
      const data = await res.json()
      wireframeResult.value = data.wireframe
    }
  } finally {
    generating.value = false
  }
}

const generateDesignSystem = async () => {
  generatingDS.value = true
  
  try {
    const res = await fetch('/api/agents/uiux/design-system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dsConfig.value)
    })
    
    if (res.ok) {
      const data = await res.json()
      designSystem.value = data.designSystem
    }
  } finally {
    generatingDS.value = false
  }
}

const exportWireframe = (format: string) => {
  console.log('Export to:', format)
}

const exportDS = (format: string) => {
  console.log('Export DS to:', format)
}

const uploadDesign = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files?.[0]) {
    uploadedFile.value = target.files[0]
  }
}

const checkAccessibility = async () => {
  checking.value = true
  
  try {
    const res = await fetch('/api/agents/uiux/accessibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ design: {} })
    })
    
    if (res.ok) {
      a11yResults.value = await res.json()
    }
  } finally {
    checking.value = false
  }
}

const getScoreClass = (score: number) => {
  if (score >= 90) return 'bg-green-600 text-white'
  if (score >= 70) return 'bg-yellow-600 text-white'
  return 'bg-red-600 text-white'
}

onMounted(async () => {
  // Load component library
  const res = await fetch('/api/agents/uiux/components')
  if (res.ok) {
    componentLibrary.value = await res.json()
  }
})
</script>
