<template>
  <div class="card h-[400px] flex flex-col">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="text-2xl">📁</span>
        <h2 class="text-lg font-semibold">Files & Outputs</h2>
      </div>
      
      <div class="flex items-center gap-2">
        <button @click="refresh" class="text-slate-400 hover:text-white">
          🔄
        </button>
        <button @click="$emit('download-all')" class="btn btn-secondary text-sm">
          ⬇️ Download All
        </button>
      </div>
    </div>

    <!-- Path breadcrumb -->
    <div class="flex items-center gap-2 mb-4 text-sm text-slate-400">
      <span v-for="(part, i) in pathParts" :key="i">
        <span v-if="i > 0"> / </span>
        <button 
          @click="navigateTo(i)"
          class="hover:text-white"
          :class="{ 'text-white': i === pathParts.length - 1 }"
        >
          {{ part }}
        </button>
      </span>
    </div>

    <!-- File list -->
    <div class="flex-1 overflow-y-auto space-y-1">
      <!-- Parent directory -->
      <button 
        v-if="currentPath !== '/'"
        @click="goUp"
        class="w-full flex items-center gap-3 p-2 rounded hover:bg-slate-700 text-left"
      >
        <span>📁 ..</span>
        <span class="text-slate-400">Parent Directory</span>
      </button>

      <!-- Files and folders -->
      <div
        v-for="item in items"
        :key="item.name"
        class="flex items-center justify-between p-2 rounded hover:bg-slate-700 group"
      >
        <button 
          @click="item.type === 'directory' ? openFolder(item) : preview(item)"
          class="flex items-center gap-3 flex-1 text-left"
        >
          <span class="text-xl">{{ item.type === 'directory' ? '📁' : getFileIcon(item.name) }}</span>
          
          <div class="flex-1 min-w-0">
            <p class="truncate">{{ item.name }}</p>
            <p class="text-xs text-slate-400">
              {{ formatSize(item.size) }} • {{ formatDate(item.modified) }}
            </p>
          </div>
        </button>

        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          <button 
            @click="download(item)"
            class="p-1 hover:bg-slate-600 rounded"
            title="Download"
          >
            ⬇️
          </button>
          
          <button 
            v-if="item.type === 'file'"
            @click="deleteFile(item)"
            class="p-1 hover:bg-slate-600 rounded text-red-400"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="items.length === 0" class="text-center py-8 text-slate-500">
        <p>No files yet</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  projectId: string
}>()

const emit = defineEmits(['download', 'preview'])

const currentPath = ref('/outputs')
const items = ref([
  { name: 'my-shop-tasks.xlsx', type: 'file', size: 15420, modified: new Date() },
  { name: 'my-shop-report.pptx', type: 'file', size: 452300, modified: new Date() },
  { name: 'screenshots', type: 'directory', size: 0, modified: new Date() },
  { name: 'zap-report.html', type: 'file', size: 125000, modified: new Date() },
])

const pathParts = computed(() => {
  return currentPath.value.split('/').filter(Boolean)
})

const getFileIcon = (name: string) => {
  if (name.endsWith('.xlsx')) return '📊'
  if (name.endsWith('.pptx')) return '📽️'
  if (name.endsWith('.html')) return '🌐'
  if (name.endsWith('.js') || name.endsWith('.ts')) return '📜'
  if (name.endsWith('.vue')) return '⚛️'
  if (name.endsWith('.py')) return '🐍'
  if (name.endsWith('.png') || name.endsWith('.jpg')) return '🖼️'
  return '📄'
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '-'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })
}

const refresh = () => {
  // Fetch files from API
}

const download = (item: any) => {
  emit('download', item)
}

const preview = (item: any) => {
  emit('preview', item)
}
</script>
