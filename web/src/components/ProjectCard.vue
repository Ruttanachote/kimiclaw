<template>
  <div class="card border-2"
    :class="isActive ? 'border-green-500' : 'border-slate-700'"
  >
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-3">
        <!-- Project Icon -->
        <div 
          class="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
          :class="isActive ? 'bg-green-600' : 'bg-slate-700'"
        >
          {{ getProjectIcon(project.type) }}
        </div>
        
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-lg">{{ project.name }}</h3>
            
            <span 
              v-if="isActive"
              class="bg-green-600 text-xs px-2 py-0.5 rounded-full"
            >
              ACTIVE
            </span>
          </div>
          
          <p class="text-sm text-slate-400">{{ project.description || 'No description' }}</p>
          
          <div class="flex items-center gap-3 mt-2 text-xs text-slate-500">
            <span>📁 {{ project.type }}</span>
            <span>📅 {{ formatDate(project.created_at) }}</span>
            <span v-if="stats">✓ {{ stats.completedTasks }}/{{ stats.totalTasks }} tasks</span>
          </div>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="flex items-center gap-2">
        <button 
          v-if="!isActive"
          @click="switchProject"
          :disabled="switching"
          class="btn btn-primary text-sm"
        >
          {{ switching ? 'Switching...' : 'Switch' }}
        </button>
        
        <button 
          v-else
          class="btn btn-secondary text-sm cursor-default"
          disabled
        >
          Current
        </button>
        
        <button 
          @click="showDetails = !showDetails"
          class="text-slate-400 hover:text-white"
        >
          {{ showDetails ? '▲' : '▼' }}
        </button>
      </div>
    </div>

    <!-- Details -->
    <div v-if="showDetails" class="mt-4 pt-4 border-t border-slate-700">
      <!-- Tech Stack -->
      <div v-if="project.settings?.techStack" class="mb-4">
        <p class="text-sm text-slate-400 mb-2">Tech Stack</p>
        
        <div class="flex flex-wrap gap-2">
          <span
            v-for="tech in project.settings.techStack"
            :key="tech"
            class="text-xs bg-slate-800 px-2 py-1 rounded"
          >
            {{ tech }}
          </span>
        </div>
      </div>

      <!-- Recent Activity -->
      <div v-if="recentActivity.length > 0" class="mb-4">
        <p class="text-sm text-slate-400 mb-2">Recent Activity</p>
        
        <div class="space-y-1">
          <div
            v-for="(activity, i) in recentActivity.slice(0, 3)"
            :key="i"
            class="text-sm flex items-center gap-2"
          >
            <span>{{ getActivityIcon(activity.type) }}</span>
            <span class="truncate">{{ activity.description }}</span>
            <span class="text-slate-500 text-xs ml-auto">{{ activity.time }}</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2">
        <button @click="openWorkspace" class="btn btn-secondary text-sm">
          📁 Open Workspace
        </button>
        
        <button @click="viewHistory" class="btn btn-secondary text-sm"
003e
          📜 History
        </button>
        
        <button 
          v-if="!isActive"
          @click="archiveProject"
          class="btn btn-secondary text-sm text-red-400"
        >
          🗑️ Archive
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  project: any
  isActive: boolean
}>()

const emit = defineEmits(['switch', 'archive'])

const showDetails = ref(false)
const switching = ref(false)

const stats = ref({
  totalTasks: 12,
  completedTasks: 8
})

const recentActivity = ref([
  { type: 'code', description: 'Frontend Agent created Login.vue', time: '2m ago' },
  { type: 'design', description: 'UI/UX Agent updated wireframe', time: '15m ago' },
  { type: 'test', description: 'QA Agent passed 5 tests', time: '1h ago' }
])

const getProjectIcon = (type: string) => {
  const icons: Record<string, string> = {
    'web-app': '🌐',
    'mobile-app': '📱',
    'e-commerce': '🛒',
    'landing-page': '🎯',
    'dashboard': '📊',
    'api': '🔌',
    'default': '📁'
  }
  return icons[type] || icons.default
}

const getActivityIcon = (type: string) => {
  const icons: Record<string, string> = {
    'code': '💻',
    'design': '🎨',
    'test': '🧪',
    'deploy': '🚀',
    'research': '🔍'
  }
  return icons[type] || '📝'
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const switchProject = async () => {
  switching.value = true
  
  try {
    const res = await fetch(`/api/projects/${props.project.project_id}/switch`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    
    if (res.ok) {
      emit('switch', props.project.project_id)
    }
  } finally {
    switching.value = false
  }
}

const openWorkspace = () => {
  console.log('Open workspace:', props.project.project_id)
}

const viewHistory = () => {
  console.log('View history:', props.project.project_id)
}

const archiveProject = () => {
  if (confirm(`Archive "${props.project.name}"?`)) {
    emit('archive', props.project.project_id)
  }
}
</script>
