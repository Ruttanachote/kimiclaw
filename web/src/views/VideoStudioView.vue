<template>
  <div class="min-h-screen bg-slate-950 p-6">
    <!-- Header -->
    <div class="max-w-7xl mx-auto mb-6">
      <div class="flex items-center gap-3">
        <span class="text-4xl">🎬</span>
        <div>
          <h1 class="text-2xl font-bold">AI Video Studio</h1>
          <p class="text-slate-400">สร้างวิดีโอจากข้อความหรือรูปภาพ</p>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto">
      <!-- Mode Selection -->
      <div class="card mb-6">
        <div class="flex gap-4">
          <button
            v-for="mode in generationModes"
            :key="mode.id"
            @click="activeMode = mode.id"
            class="flex-1 p-4 rounded-lg border-2 text-center transition-all"
            :class="activeMode === mode.id 
              ? 'border-blue-500 bg-blue-500/20' 
              : 'border-slate-700 hover:border-slate-600'"
          >
            <div class="text-3xl mb-2">{{ mode.icon }}</div>
            <div class="font-semibold">{{ mode.name }}</div>
            <div class="text-sm text-slate-400 mt-1">{{ mode.description }}</div>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left: Input Panel -->
        <div class="card">
          <!-- Text-to-Video Mode -->
          <div v-if="activeMode === 'text-to-video'">
            <h2 class="font-semibold mb-4">📝 Text to Video</h2>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm text-slate-400 mb-1">Describe your video</label>
                <textarea
                  v-model="textPrompt"
                  placeholder="A serene Japanese garden with cherry blossoms falling, gentle wind moving the trees, sunlight filtering through..."
                  class="input w-full h-40 resize-none"
                ></textarea>
                
                <div class="flex justify-between mt-1">
                  <button 
                    @click="enhanceTextPrompt"
                    class="text-sm text-blue-400 hover:text-blue-300"
                  >
                    ✨ Enhance Prompt
                  </button>
                  
                  <span class="text-xs text-slate-500">{{ textPrompt.length }} chars</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Image-to-Video Mode -->
          <div v-if="activeMode === 'image-to-video'">
            <h2 class="font-semibold mb-4">🖼️ Image to Video</h2>
            
            <div class="space-y-4">
              <!-- Image Upload -->
              <div
                @click="$refs.fileInput.click()"
                @drop.prevent="handleDrop"
                @dragover.prevent
                class="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-slate-800/50 transition-all"
                :class="{ 'border-blue-500 bg-blue-500/10': isDragging }"
                @dragenter="isDragging = true"
                @dragleave="isDragging = false"
              >
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleFileSelect"
                />
                
                <div v-if="!uploadedImage"
                >
                  <div class="text-4xl mb-2">📤</div>
                  <p class="text-slate-400">Click or drag image here</p>
                  <p class="text-xs text-slate-500 mt-1">Supports: JPG, PNG, WebP (max 10MB)</p>
                </div>
                
                <div v-else class="relative"
                >
                  <img
                    :src="uploadedImage"
                    class="max-h-48 mx-auto rounded-lg"
                  />
                  
                  <button
                    @click.stop="clearImage"
                    class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-sm hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <!-- Image Prompt -->
              <div>
                <label class="block text-sm text-slate-400 mb-1">Motion description (optional)</label>
                <textarea
                  v-model="imagePrompt"
                  placeholder="Describe how the image should move... (e.g., 'camera slowly zooms in, leaves gently swaying in the wind')"
                  class="input w-full h-24 resize-none"
                ></textarea>
              </div>

              <!-- Keyframes (for advanced) -->
              <div v-if="showKeyframes">
                <label class="block text-sm text-slate-400 mb-2">End Frame (optional)</label>
                
                <div
                  @click="$refs.endFrameInput.click()"
                  class="border-2 border-dashed border-slate-700 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500"
                >
                  <input
                    ref="endFrameInput"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="handleEndFrameSelect"
                  />
                  
                  <img
                    v-if="endFrameImage"
                    :src="endFrameImage"
                    class="max-h-32 mx-auto rounded"
                  />
                  
                  <p v-else class="text-sm text-slate-500">+ Add end frame for transition</p>
                </div>
              </div>

              <button
                @click="showKeyframes = !showKeyframes"
                class="text-sm text-blue-400 hover:text-blue-300"
              >
                {{ showKeyframes ? '▼' : '▶' }} Advanced: Keyframe Animation
              </button>
            </div>
          </div>

          <!-- Provider Selection -->
          <div class="mt-6">
            <label class="block text-sm text-slate-400 mb-2">AI Provider</label>
            
            <div class="space-y-2">
              <button
                v-for="provider in availableProviders"
                :key="provider.id"
                @click="selectedProvider = provider.id"
                class="w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3"
                :class="selectedProvider === provider.id 
                  ? 'border-blue-500 bg-blue-500/20' 
                  : 'border-slate-700 hover:border-slate-600'"
              >
                <span class="text-2xl">{{ provider.icon }}</span>
                
                <div class="flex-1">
                  <div class="font-medium">{{ provider.name }}</div>
                  <div class="text-xs text-slate-500">{{ provider.description }}</div>
                </div>
                
                <div class="text-right">
                  <div class="text-xs text-slate-500">Max {{ provider.maxDuration }}s</div>
                  <div class="text-xs text-green-400">${{ provider.pricing.perSecond }}/s</div>
                </div>
              </button>
            </div>
          </div>

          <!-- Settings -->
          <div class="mt-6 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-slate-400 mb-1">Duration</label>
                <select v-model="config.duration" class="input"
                >
                  <option v-for="d in durationOptions" :key="d" :value="d">{{ d }} seconds</option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm text-slate-400 mb-1">Aspect Ratio</label>
                <select v-model="config.aspectRatio" class="input"
                >
                  <option v-for="r in aspectRatios" :key="r" :value="r">{{ r }}</option>
                </select>
              </div>
            </div>

            <div class="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
              <span class="text-slate-400">Estimated Cost</span>
              <span class="text-xl font-bold text-green-400">${{ estimatedCost.toFixed(3) }}</span>
            </div>
          </div>

          <button
            @click="generateVideo"
            :disabled="!canGenerate || generating"
            class="btn btn-primary w-full mt-6"
            :class="{ 'opacity-50': !canGenerate || generating }"
          >
            {{ generating ? `⏳ Generating... ${progress}%` : '🎬 Generate Video' }}
          </button>
        </div>

        <!-- Right: Preview & Results -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Preview Area -->
          <div class="card">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold">👁️ Preview</h3>
              
              <div class="flex gap-2">
                <button
                  v-for="device in previewDevices"
                  :key="device.id"
                  @click="previewDevice = device.id"
                  class="text-sm px-3 py-1 rounded"
                  :class="previewDevice === device.id ? 'bg-blue-600' : 'bg-slate-800'"
                >
                  {{ device.icon }}
                </button>
              </div>
            </div>
            
            <div 
              class="bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center"
              :style="previewContainerStyle"
            >
              <video
                v-if="generatedVideo"
                :src="generatedVideo"
                controls
                autoplay
                loop
                class="w-full h-full object-contain"
              ></video>
              
              <div v-else-if="uploadedImage && activeMode === 'image-to-video'" class="relative w-full h-full"
              >
                <img
                  :src="uploadedImage"
                  class="w-full h-full object-contain"
                />
                
                <div class="absolute inset-0 flex items-center justify-center bg-black/50"
                >
                  <div class="text-center"
003e
                    <span class="text-4xl">🖼️</span>
                    <p class="text-slate-400 mt-2">Ready to animate</p>
                  </div>
                </div>
              </div>
              
              <div v-else class="text-center p-12">
                <span class="text-6xl">🎬</span>
                <p class="text-slate-500 mt-4">{{ activeMode === 'text-to-video' ? 'Enter a prompt to generate' : 'Upload an image to animate' }}</p>
              </div>
            </div>
          </div>

          <!-- Generation Progress -->
          <div v-if="generating" class="card border-2 border-blue-600">
            <h3 class="font-semibold mb-4">⏳ Generation Progress</h3>
            
            <div class="h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
              <div
                class="h-full bg-blue-600 transition-all duration-500"
                :style="{ width: progress + '%' }"
              ></div>
            </div>
            
            <div class="space-y-2">
              <div
                v-for="step in generationSteps"
                :key="step.name"
                class="flex items-center gap-3"
              >
                <span class="text-lg">{{ getStepIcon(step.status) }}</span>
                <span :class="step.status === 'pending' ? 'text-slate-500' : ''">
                  {{ step.name }}
                </span>
              </div>
            </div>
          </div>

          <!-- Recent Generations -->
          <div v-if="recentVideos.length > 0" class="card">
            <h3 class="font-semibold mb-4">📁 Recent Generations</h3>
            
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div
                v-for="video in recentVideos"
                :key="video.id"
                class="bg-slate-800 rounded-lg overflow-hidden cursor-pointer group"
                @click="loadVideo(video)"
              >
                <div class="aspect-video bg-slate-700 relative">
                  <video
                    :src="video.url"
                    class="w-full h-full object-cover"
                    muted
                    loop
                    @mouseenter="$event.target.play()"
                    @mouseleave="$event.target.pause()"
                  ></video>
                  
                  <div class="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded text-xs"
                  >
                    {{ video.source === 'text' ? '📝' : '🖼️' }}
                  </div>
                </div>
                
                <div class="p-3">
                  <div class="flex items-center gap-2 mb-1"
003e
                    <span>{{ getProviderIcon(video.provider) }}</span>
                    <span class="text-sm font-medium">{{ video.duration }}s</span>
                  </div>
                  
                  <p class="text-sm text-slate-400 truncate">{{ video.prompt || 'Image to video' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// Generation Modes
const generationModes = [
  { 
    id: 'text-to-video', 
    name: 'Text to Video', 
    icon: '📝',
    description: 'Describe a scene and AI creates video'
  },
  { 
    id: 'image-to-video', 
    name: 'Image to Video', 
    icon: '🖼️',
    description: 'Upload image and AI animates it'
  }
]

const activeMode = ref('text-to-video')

// Inputs
const textPrompt = ref('')
const imagePrompt = ref('')
const uploadedImage = ref('')
const endFrameImage = ref('')
const isDragging = ref(false)
const showKeyframes = ref(false)

// Providers
const providers = ref([
  { 
    id: 'runway', 
    name: 'Runway Gen-3', 
    icon: '🟢', 
    description: 'Best quality, motion brush',
    maxDuration: 16,
    pricing: { perSecond: 0.08 },
    supports: ['text-to-video', 'image-to-video']
  },
  { 
    id: 'kling', 
    name: 'Kling AI', 
    icon: '🔴', 
    description: 'Cinematic, lip-sync',
    maxDuration: 10,
    pricing: { perSecond: 0.03 },
    supports: ['text-to-video', 'image-to-video']
  },
  { 
    id: 'luma', 
    name: 'Luma Dream', 
    icon: '🟣', 
    description: 'Fast, smooth motion',
    maxDuration: 5,
    pricing: { perSecond: 0.04 },
    supports: ['text-to-video', 'image-to-video']
  },
  { 
    id: 'pika', 
    name: 'Pika Labs', 
    icon: '🟡', 
    description: 'Creative effects',
    maxDuration: 5,
    pricing: { perSecond: 0.02 },
    supports: ['text-to-video', 'image-to-video']
  },
  { 
    id: 'veo3', 
    name: 'Google Veo 3', 
    icon: '🔵', 
    description: 'Realistic motion',
    maxDuration: 8,
    pricing: { perSecond: 0.05 },
    supports: ['text-to-video']
  }
])

const selectedProvider = ref('runway')

const availableProviders = computed(() => {
  return providers.value.filter(p => 
    p.supports.includes(activeMode.value)
  )
})

const selectedProviderInfo = computed(() => 
  providers.value.find(p => p.id === selectedProvider.value)
)

// Config
const config = ref({
  duration: 5,
  aspectRatio: '16:9'
})

const durationOptions = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16]
const aspectRatios = ['16:9', '9:16', '1:1', '4:3', '21:9']

const previewDevice = ref('desktop')
const previewDevices = [
  { id: 'desktop', icon: '🖥️' },
  { id: 'tablet', icon: '📱' },
  { id: 'mobile', icon: '📱' }
]

// Generation
const generating = ref(false)
const progress = ref(0)
const generatedVideo = ref('')
const recentVideos = ref([])

const generationSteps = ref([
  { name: 'Uploading image', status: 'pending' },
  { name: 'Analyzing content', status: 'pending' },
  { name: 'Generating video', status: 'pending' },
  { name: 'Processing', status: 'pending' },
  { name: 'Finalizing', status: 'pending' }
])

const canGenerate = computed(() => {
  if (activeMode.value === 'text-to-video') {
    return textPrompt.value.trim().length > 10
  }
  return uploadedImage.value !== ''
})

const estimatedCost = computed(() => {
  const provider = selectedProviderInfo.value
  if (!provider) return 0
  return provider.pricing.perSecond * config.value.duration
})

const previewContainerStyle = computed(() => {
  const [w, h] = config.value.aspectRatio.split(':').map(Number)
  return { aspectRatio: `${w}/${h}` }
})

// File handling
const handleFileSelect = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) processFile(file)
}

const handleDrop = (e: DragEvent) => {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file && file.type.startsWith('image/')) {
    processFile(file)
  }
}

const processFile = (file: File) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    uploadedImage.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const handleEndFrameSelect = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      endFrameImage.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

const clearImage = () => {
  uploadedImage.value = ''
}

const enhanceTextPrompt = async () => {
  // Call API to enhance
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

const getProviderIcon = (id: string) => {
  return providers.value.find(p => p.id === id)?.icon || '🎬'
}

const generateVideo = async () => {
  generating.value = true
  progress.value = 0
  
  // Update steps based on mode
  if (activeMode.value === 'text-to-video') {
    generationSteps.value[0].name = 'Processing prompt'
  }
  
  // Simulate generation
  for (let i = 0; i <= 100; i += 10) {
    progress.value = i
    await new Promise(r => setTimeout(r, 500))
  }
  
  generating.value = false
  generatedVideo.value = 'https://example.com/video.mp4'
  
  recentVideos.value.unshift({
    id: Date.now(),
    url: generatedVideo.value,
    source: activeMode.value === 'text-to-video' ? 'text' : 'image',
    provider: selectedProvider.value,
    prompt: activeMode.value === 'text-to-video' ? textPrompt.value : imagePrompt.value,
    duration: config.value.duration
  })
}

const loadVideo = (video: any) => {
  generatedVideo.value = video.url
}
</script>
