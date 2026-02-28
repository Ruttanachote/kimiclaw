<template>
  <div class="min-h-screen bg-slate-950 p-6">
    <!-- Header Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div 
        v-for="stat in headerStats" 
        :key="stat.label"
        class="card p-4"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-slate-400">{{ stat.label }}</p>
            <p class="text-2xl font-bold">{{ stat.value }}</p>
          </div>
          <span class="text-3xl">{{ stat.icon }}</span>
        </div>
        
        <div class="mt-2 flex items-center gap-1 text-sm"
          :class="stat.trend > 0 ? 'text-green-500' : 'text-slate-400'"
        >
          <span>{{ stat.trend > 0 ? '↑' : '→' }} {{ Math.abs(stat.trend) }}%</span>
          <span class="text-slate-500">vs yesterday</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left: Agent Grid -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Agent Status Grid -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">Agent Status</h2>
            <div class="flex gap-2">
              <span class="flex items-center gap-1 text-xs">
                <span class="w-2 h-2 rounded-full bg-green-500"></span> Ready
              </span>
              <span class="flex items-center gap-1 text-xs">
                <span class="w-2 h-2 rounded-full bg-yellow-500"></span> Busy
              </span>
              <span class="flex items-center gap-1 text-xs">
                <span class="w-2 h-2 rounded-full bg-red-500"></span> Issue
              </span>
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              v-for="agent in agents"
              :key="agent.name"
              @click="selectAgent(agent)"
              class="p-4 rounded-lg border transition-all hover:scale-105"
              :class="getAgentCardClass(agent.status)"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-2xl">{{ agent.icon }}</span>
                <span 
                  class="w-2 h-2 rounded-full animate-pulse"
                  :class="getStatusColor(agent.status)"
                ></span>
              </div>
              
              <p class="font-medium text-sm">{{ agent.name }}</p>
              <p class="text-xs opacity-70">{{ agent.status }}</p>

              <!-- Mini progress -->
              <div v-if="agent.progress > 0" class="mt-2">
                <div class="h-1 bg-black/20 rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-white/80"
                    :style="{ width: `${agent.progress}%` }"
                  ></div>
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Activity Chart -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">Activity (24h)</h2>
            <select v-model="activityFilter" class="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm">
              <option value="all">All Agents</option>
              <option v-for="agent in agents" :key="agent.name" :value="agent.name">
                {{ agent.name }}
              </option>
            </select>
          </div>

          <!-- Simple bar chart -->
          <div class="flex items-end gap-2 h-32">
            <div
              v-for="(bar, i) in activityBars"
              :key="i"
              class="flex-1 bg-blue-500/50 hover:bg-blue-500 rounded-t transition-all relative group"
              :style="{ height: `${bar.value}%` }"
            >
              <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 whitespace-nowrap">
                {{ bar.hour }}:00 - {{ bar.count }} tasks
              </div>
            </div>
          </div>
          
          <div class="flex justify-between mt-2 text-xs text-slate-500">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:59</span>
          </div>
        </div>
      </div>

      <!-- Right: Sidebar -->
      <div class="space-y-6">
        <!-- Recent Tasks -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">Recent Tasks</h2>
            <button @click="$emit('view-all-tasks')" class="text-sm text-blue-400 hover:text-blue-300">
              View All →
            </button>
          </div>

          <div class="space-y-3">
            <div
              v-for="task in recentTasks"
              :key="task.id"
              class="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50"
            >
              <span class="text-xl">{{ task.icon }}</span>
              
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm truncate">{{ task.name }}</p>
                <p class="text-xs text-slate-400">{{ task.agent }} • {{ task.time }}</p>
              </div>

              <span 
                class="text-xs px-2 py-1 rounded"
                :class="getTaskStatusClass(task.status)"
              >
                {{ task.status }}
              </span>
            </div>
          </div>
        </div>

        <!-- Alerts -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">Alerts</h2>
            <span v-if="alerts.length > 0" class="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {{ alerts.length }}
            </span>
          </div>

          <div v-if="alerts.length === 0" class="text-center py-4 text-slate-500">
            <p>🎉 No alerts</p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="alert in alerts"
              :key="alert.id"
              class="p-3 rounded-lg border-l-4"
              :class="getAlertClass(alert.type)"
            >
              <p class="font-medium text-sm">{{ alert.title }}</p>
              <p class="text-xs opacity-80">{{ alert.message }}</p>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="card">
          <h2 class="text-lg font-semibold mb-4">Quick Start</h2>
          
          <div class="grid grid-cols-2 gap-3">
            <button
              v-for="action in quickActions"
              :key="action.id"
              @click="$emit('quick-action', action.id)"
              class="p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all text-left"
            >
              <span class="text-xl">{{ action.icon }}</span>
              <p class="font-medium text-sm mt-1">{{ action.name }}</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  agentsData: Record<string, any>
}>()

const emit = defineEmits(['select-agent', 'view-all-tasks', 'quick-action'])

const activityFilter = ref('all')

// Header stats
const headerStats = ref([
  { label: 'Active Agents', value: 8, icon: '🤖', trend: 0 },
  { label: 'Tasks Today', value: 24, icon: '✅', trend: 12 },
  { label: 'Projects', value: 5, icon: '📁', trend: 25 },
  { label: 'Success Rate', value: '94%', icon: '📈', trend: 3 }
])

// Agent grid data
const agents = computed(() => {
  return Object.entries(props.agentsData || {}).map(([name, data]: [string, any]) => ({
    name,
    icon: getAgentIcon(data.type),
    status: data.status,
    progress: data.progress || 0,
    type: data.type
  }))
})

// Activity bars (mock data)
const activityBars = ref(
  Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    value: Math.random() * 60 + 20,
    count: Math.floor(Math.random() * 10)
  }))
)

// Recent tasks
const recentTasks = ref([
  { id: 1, name: 'Create Vue project', agent: 'frontend-agent', status: 'completed', time: '2m ago', icon: '⚛️' },
  { id: 2, name: 'Search Flutter docs', agent: 'research-agent', status: 'running', time: '5m ago', icon: '🔍' },
  { id: 3, name: 'Design homepage', agent: 'uiux-agent', status: 'completed', time: '15m ago', icon: '🎨' },
  { id: 4, name: 'Security scan', agent: 'qa-agent', status: 'pending', time: '1h ago', icon: '🧪' }
])

// Alerts
const alerts = ref([
  { id: 1, type: 'warning', title: 'High CPU Usage', message: 'Research Agent using 85% CPU' },
  { id: 2, type: 'info', title: 'Upgrade Available', message: 'Frontend Agent can be upgraded' }
])

// Quick actions
const quickActions = ref([
  { id: 'new-project', name: 'New Project', icon: '📁' },
  { id: 'new-agent', name: 'Add Agent', icon: '➕' },
  { id: 'research', name: 'Research', icon: '🔍' },
  { id: 'deploy', name: 'Deploy', icon: '🚀' }
])

const getAgentIcon = (type: string) => {
  const icons: Record<string, string> = {
    research: '🔍', uiux: '🎨', frontend: '⚛️', backend: '🔧',
    qa: '🧪', pmba: '📊', supervisor: '👁️', secretary: '💬'
  }
  return icons[type] || '🤖'
}

const getAgentCardClass = (status: string) => {
  const classes: Record<string, string> = {
    idle: 'bg-green-900/30 border-green-700/50 hover:bg-green-900/50',
    busy: 'bg-yellow-900/30 border-yellow-700/50 hover:bg-yellow-900/50',
    offline: 'bg-slate-800 border-slate-700 hover:bg-slate-700',
    error: 'bg-red-900/30 border-red-700/50 hover:bg-red-900/50'
  }
  return classes[status] || classes.offline
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    idle: 'bg-green-500', busy: 'bg-yellow-500', offline: 'bg-slate-500', error: 'bg-red-500'
  }
  return colors[status] || 'bg-slate-500'
}

const getTaskStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    completed: 'bg-green-600',
    running: 'bg-blue-600',
    pending: 'bg-yellow-600'
  }
  return classes[status] || 'bg-slate-600'
}

const getAlertClass = (type: string) => {
  const classes: Record<string, string> = {
    warning: 'bg-yellow-900/30 border-yellow-500',
    error: 'bg-red-900/30 border-red-500',
    info: 'bg-blue-900/30 border-blue-500'
  }
  return classes[type] || classes.info
}

const selectAgent = (agent: any) => {
  emit('select-agent', agent)
}
</script>
