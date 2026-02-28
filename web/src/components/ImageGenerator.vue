<template>
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="text-2xl">🎨</span>
        <h2 class="text-lg font-semibold">AI Image Generator</h2>
      </div>
      
      <select v-model="selectedProvider" class="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-sm">
        <option v-for="provider in providers" :key="provider.id" :value="provider.id">
          {{ provider.name }}
        </option>
      </select>
    </div>

    <!-- Prompt Input -->
    <div class="mb-4">
      <textarea
        v-model="prompt"
        placeholder="Describe the image you want to generate...\n\nExample: A futuristic city with flying cars, neon lights, cyberpunk style, 8k resolution"
        class="input w-full h-32 resize-none"
      ></textarea>
      
      <div class="flex items-center justify-between mt-2">
        <button @click="enhancePrompt" class="text-sm text-blue-400 hover:text-blue-300">
          ✨ Enhance Prompt
        </button>
        
        <span class="text-xs text-slate-500">{{ prompt.length }} chars</span>
      </div>
    </div>

    <!-- Options -->
    <div class="grid grid-cols-2 gap-4 mb-4">
      <div>
        <label class="block text-sm text-slate-400 mb-1">Size</label>
        <select v-model="options.size" class="input">
          <option value="1024x1024">1024x1024 (Square)</option>
          <option value="1792x1024">1792x1024 (Landscape)</option>
          <option value="1024x1792">1024x1792 (Portrait)</option>
        </select>
      </div>

      <div>
        <label class="block text-sm text-slate-400 mb-1">Style</label>
        <select v-model="options.style" class="input">
          <option value="vivid">Vivid (More colorful)</option>
          <option value="natural">Natural (More realistic)</option>
        </select>
      </div>
    </div>

    <!-- Generate Button -->
    <button 
      @click="generate"
      :disabled="!canGenerate || generating"
      class="btn btn-primary w-full"
      :class="{ 'opacity-50 cursor-not-allowed': !canGenerate || generating }"
    >
      <span v-if="generating">
        ⏳ Generating... {{ progress }}%
      </span>
      <span v-else-if="!canGenerate">
        Enter a prompt to generate
      </span>
      <span v-else>
        🎨 Generate Image (~${{ estimatedCost }})
      </span>
    </button>

    <!-- Error -->
    <div v-if="error" class="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
      {{ error }}
    </div>

    <!-- Result -->
    <div v-if="generatedImage" class="mt-4">
      <div class="relative group">
        <img 
          :src="generatedImage.url" 
          :alt="prompt"
          class="w-full rounded-lg"
        />
        
        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity rounded-lg">
          <button @click="downloadImage" class="btn btn-secondary">
            ⬇️ Download
          </button>
          
          <button @click="useInProject" class="btn btn-primary">
            📁 Use in Project
          </button>
        </div>
      </div>
      
      <div class="flex items-center justify-between mt-2">
        <span class="text-sm text-slate-400">Cost: ${{ generatedImage.cost }}</span>
        
        <button @click="generateVariation" class="text-sm text-blue-400 hover:text-blue-300">
          🔄 Generate Variation
        </button>
      </div>
    </div>

    <!-- Gallery -->
    <div v-if="gallery.length > 0" class="mt-6">
      <h3 class="font-medium mb-3">Recent Generations</h3>
      
      <div class="grid grid-cols-3 gap-2">
        <div
          v-for="(img, i) in gallery"
          :key="i"
          class="relative aspect-square cursor-pointer group"
          @click="loadFromGallery(img)"
        >
          <img :src="img.url" class="w-full h-full object-cover rounded" />
          
          <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
            <span class="text-white text-sm">Load</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const prompt = ref('')
const selectedProvider = ref('openai')
const generating = ref(false)
const progress = ref(0)
const error = ref('')
const generatedImage = ref<any>(null)
const gallery = ref<any[]>([])

const options = ref({
  size: '1024x1024',
  style: 'vivid',
  quality: 'standard'
})

const providers = ref([
  { id: 'openai', name: 'DALL-E 3 (OpenAI)', costPerImage: 0.04 },
  { id: 'midjourney', name: 'Midjourney (via API)', costPerImage: 0.08 },
  { id: 'stability', name: 'Stable Diffusion XL', costPerImage: 0.02 },
  { id: 'leonardo', name: 'Leonardo AI', costPerImage: 0.03 }
])

const canGenerate = computed(() => prompt.value.trim().length > 10)

const estimatedCost = computed(() => {
  const provider = providers.value.find(p => p.id === selectedProvider.value)
  return provider?.costPerImage || 0.04
})

const enhancePrompt = async () => {
  if (!prompt.value) return
  
  // Call API to enhance prompt
  try {
    const res = await fetch('/api/ai/enhance-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt.value })
    })
    
    if (res.ok) {
      const data = await res.json()
      prompt.value = data.enhanced
    }
  } catch (err) {
    console.error('Failed to enhance:', err)
  }
}

const generate = async () => {
  generating.value = true
  error.value = ''
  progress.value = 0
  
  // Simulate progress
  const interval = setInterval(() => {
    progress.value += Math.random() * 15
    if (progress.value >= 90) clearInterval(interval)
  }, 500)
  
  try {
    const res = await fetch('/api/ai/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt.value,
        provider: selectedProvider.value,
        options: options.value
      })
    })
    
    clearInterval(interval)
    progress.value = 100
    
    if (!res.ok) throw new Error('Generation failed')
    
    const data = await res.json()
    
    generatedImage.value = {
      url: data.url,
      cost: estimatedCost.value,
      prompt: prompt.value
    }
    
    // Add to gallery
    gallery.value.unshift({
      url: data.url,
      prompt: prompt.value
    })
    
    // Keep only last 9
    if (gallery.value.length > 9) {
      gallery.value = gallery.value.slice(0, 9)
    }
    
  } catch (err: any) {
    error.value = err.message
  } finally {
    generating.value = false
  }
}

const downloadImage = () => {
  const link = document.createElement('a')
  link.href = generatedImage.value.url
  link.download = `ai-generated-${Date.now()}.png`
  link.click()
}

const useInProject = () => {
  // Emit event to parent
  console.log('Use in project:', generatedImage.value)
}

const generateVariation = () => {
  prompt.value += ' (variation)'
  generate()
}

const loadFromGallery = (img: any) => {
  generatedImage.value = img
}
</script>
