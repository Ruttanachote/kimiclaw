<template>
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="text-2xl">📝</span>
        <h2 class="text-lg font-semibold">Task History</h2>
      </div>
      
      <div class="flex items-center gap-2">
        <input 
          v-model="search"
          type="text"
          placeholder="Search tasks..."
          class="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-sm"
        />
        
        <select v-model="filter" class="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-sm">
          <option value="all">All</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="running">Running</option>
        </select>
      </div>
    </div>

    <!-- Task list -->
    <div class="space-y-2 max-h-[400px] overflow-y-auto">
      <div
        v-for="task in filteredTasks"
        :key="task.id"
        class="p-3 rounded-lg border"
        :class="getTaskClass(task.status)"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span>{{ getStatusIcon(task.status) }}</span>
            
            <div>
              <p class="font-medium">{{ task.name }}</p>
              <p class="text-xs text-slate-400">
                {{ task.agent }} • {{ formatTime(task.time) }}
              </p>
            </div>
          </div>
          
          <button 
            @click="showDetails(task)"
            class="text-slate-400 hover:text-white text-sm"
          >
            Details →
          </button>
        </div>

        <!-- Progress for running tasks -->
        <div v-if="task.status === 'running' && task.progress" class="mt-2">
          <div class="h-1 bg-slate-700 rounded-full overflow-hidden">
            <div 
              class="h-full bg-blue-500"
              :style="{ width: `${task.progress}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const search = ref('')
const filter = ref('all')

const tasks = ref([
  { id: 1, name: 'Create Vue project', agent: 'frontend-agent', status: 'completed', time: new Date(Date.now() - 3600000), progress: 100 },
  { id: 2, name: 'Search Flutter docs', agent: 'research-agent', status: 'completed', time: new Date(Date.now() - 7200000), progress: 100 },
  { id: 3, name: 'Design homepage', agent: 'uiux-agent', status: 'running', time: new Date(Date.now() - 300000), progress: 65 },
  { id: 4, name: 'Security scan', agent: 'qa-agent', status: 'failed', time: new Date(Date.now() - 86400000), progress: 0 },
])

const filteredTasks = computed(() => {
  return tasks.value.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(search.value.toLowerCase())
    const matchesFilter = filter.value === 'all' || task.status === filter.value
    return matchesSearch && matchesFilter
  })
})

const getTaskClass = (status: string) => {
  const classes: Record<string, string> = {
    completed: 'bg-green-900/20 border-green-700',
    failed: 'bg-red-900/20 border-red-700',
    running: 'bg-blue-900/20 border-blue-700'
  }
  return classes[status] || 'bg-slate-800 border-slate-700'
}

const getStatusIcon = (status: string) => {
  const icons: Record<string, string> = {
    completed: '✅',
    failed: '❌',
    running: '⏳'
  }
  return icons[status] || '⏸️'
}

const formatTime = (date: Date) => {
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return date.toLocaleDateString()
}

const showDetails = (task: any) => {
  console.log('Task details:', task)
}
</script>
