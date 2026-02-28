<template>
  <div class="card h-[600px] flex flex-col">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="text-2xl">🖥️</span>
        <h2 class="text-lg font-semibold">Research Agent View</h2>
      </div>
      <div class="flex items-center gap-2">
        <span 
          class="w-2 h-2 rounded-full"
          :class="connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'"
        ></span>
        <span class="text-sm text-slate-400">
          {{ connectionStatus === 'connected' ? 'Live' : 'Disconnected' }}
        </span>
      </div>
    </div>

    <!-- VNC Iframe -->
    <div class="flex-1 bg-slate-950 rounded-lg overflow-hidden relative">
      <iframe
        v-if="showViewer"
        :src="vncUrl"
        class="w-full h-full border-0"
        @load="onLoad"
        @error="onError"
      ></iframe>
      <!-- Loading State -->
      <div 
        v-if="loading" 
        class="absolute inset-0 flex items-center justify-center bg-slate-950"
      >
        <div class="text-center">
          <div class="animate-spin text-4xl mb-4">🔄</div>
          <p class="text-slate-400">Connecting to Research Agent...\u003c/p>
        </div>
      </div>
      
      <!-- Error State -->
      <div 
        v-if="error" 
        class="absolute inset-0 flex items-center justify-center bg-slate-950"
      >
        <div class="text-center">
          <div class="text-4xl mb-4">❌</div>
          <p class="text-red-400 mb-4">Failed to connect\u003c/p>
          <button @click="retry" class="btn btn-primary">
            🔄 Retry
          </button>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="mt-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <button @click="toggleViewer" class="btn btn-secondary text-sm">
          {{ showViewer ? '🙈 Hide' : '👁️ Show' }}
        </button>
        <a 
          :href="vncUrl" 
          target="_blank"
          class="btn btn-secondary text-sm"
        >
          ↗️ Open in New Tab
        </a>
      </div>
      
      <p class="text-xs text-slate-500">
        VNC Password: devstudio123
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const vncUrl = ref('/vnc/')  // Proxy ผ่าน Nginx
const showViewer = ref(true)
const loading = ref(true)
const error = ref(false)
const connectionStatus = ref('connecting')

const onLoad = () => {
  loading.value = false
  error.value = false
  connectionStatus.value = 'connected'
}

const onError = () => {
  loading.value = false
  error.value = true
  connectionStatus.value = 'error'
}

const retry = () => {
  loading.value = true
  error.value = false
  connectionStatus.value = 'connecting'
  // Force reload iframe
  showViewer.value = false
  setTimeout(() => {
    showViewer.value = true
  }, 100)
}

const toggleViewer = () => {
  showViewer.value = !showViewer.value
}

onMounted(() => {
  // Auto-retry ถ้าไม่ติดใน 10 วินาที
  setTimeout(() => {
    if (loading.value) {
      retry()
    }
  }, 10000)
})
</script>
