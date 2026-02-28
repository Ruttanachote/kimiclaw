<template>
  <div class="fixed bottom-4 right-4 z-50 w-80">
    <!-- Usage Monitor Panel -->
    <div class="card">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="text-lg">📊</span>
          <span class="font-semibold">Live Usage</span>
        </div>
        
        <button @click="expanded = !expanded" class="text-slate-400 hover:text-white">
          {{ expanded ? '▼' : '▲' }}
        </button>
      </div>

      <!-- Compact View -->
      <div v-if="!expanded">
        <div class="flex items-center justify-between text-sm">
          <span class="text-slate-400">Requests</span>
          <span :class="usagePercent > 80 ? 'text-red-400' : 'text-green-400'">
            {{ usage.today }} / {{ usage.limit }}
          </span>
        </div>
        
        <div class="mt-1 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div 
            class="h-full transition-all duration-300"
            :class="usagePercent > 80 ? 'bg-red-500' : 'bg-green-500'"
            :style="{ width: `${Math.min(usagePercent, 100)}%` }"
          ></div>
        </div>
      </div>

      <!-- Expanded View -->
      <div v-else class="space-y-3">
        <!-- Requests -->
        <div>
          <div class="flex items-center justify-between text-sm mb-1">
            <span class="text-slate-400">Requests Today</span>
            <span>{{ usage.today }} / {{ usage.limit }}</span>
          </div>
          
          <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              class="h-full bg-blue-500 transition-all"
              :style="{ width: `${(usage.today / usage.limit) * 100}%` }"
            ></div>
          </div>
        </div>

        <!-- Tokens -->
        <div>
          <div class="flex items-center justify-between text-sm mb-1">
            <span class="text-slate-400">Tokens</span>
            <span>{{ formatNumber(usage.tokens) }}</span>
          </div>
          
          <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              class="h-full bg-purple-500 transition-all"
              :style="{ width: `${(usage.tokens / usage.tokenLimit) * 100}%` }"
            ></div>
          </div>
        </div>

        <!-- Cost -->
        <div class="flex items-center justify-between p-2 bg-slate-800 rounded">
          <span class="text-slate-400 text-sm">Est. Cost</span>
          <span class="font-mono">${{ usage.cost.toFixed(4) }}</span>
        </div>

        <!-- Active Provider -->
        <div v-if="currentProvider" class="flex items-center gap-2 p-2 bg-slate-800 rounded">
          <span>{{ currentProvider.icon }}</span>
          <span class="text-sm">{{ currentProvider.name }}</span>
          <span class="text-xs text-slate-500 ml-auto">{{ currentProvider.model }}</span>
        </div>

        <!-- Recent Activity -->
        <div v-if="recentActivity.length > 0">
          <p class="text-xs text-slate-400 mb-2">Recent</p>
          
          <div class="space-y-1 max-h-24 overflow-y-auto">
            <div
              v-for="(activity, i) in recentActivity"
              :key="i"
              class="flex items-center justify-between text-xs p-1 rounded"
              :class="activity.type === 'error' ? 'bg-red-900/30' : 'bg-slate-800'"
            >
              <span class="truncate flex-1">{{ activity.action }}</span>
              <span class="text-slate-500">{{ activity.time }}</span>
            </div>
          </div>
        </div>

        <!-- Upgrade CTA -->
        <div v-if="usagePercent > 80" class="p-2 bg-yellow-900/30 border border-yellow-700 rounded">
          <p class="text-xs text-yellow-400 mb-2">⚠️ Approaching limit</p>
          
          <button @click="$emit('upgrade')" class="btn btn-primary w-full text-sm">
            Upgrade Plan
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const expanded = ref(false)

const usage = ref({
  today: 23,
  limit: 50,
  tokens: 15420,
  tokenLimit: 100000,
  cost: 0.0456
})

const currentProvider = ref({
  icon: '🟣',
  name: 'Claude',
  model: 'claude-3-5-sonnet'
})

const recentActivity = ref([
  { action: 'Generated Vue component', time: '2s ago', type: 'success' },
  { action: 'Search web: Flutter', time: '5s ago', type: 'success' },
  { action: 'Design wireframe', time: '12s ago', type: 'success' }
])

const usagePercent = computed(() => (usage.value.today / usage.value.limit) * 100)

let ws: WebSocket | null = null
let reconnectInterval: number | null = null

const connectWebSocket = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  ws = new WebSocket(`${protocol}//${window.location.host}/ws`)
  
  ws.onopen = () => {
    // Authenticate
    const token = localStorage.getItem('token')
    ws?.send(JSON.stringify({
      type: 'auth',
      payload: { token }
    }))
    
    // Subscribe to usage updates
    ws?.send(JSON.stringify({
      type: 'subscribe',
      payload: { channel: 'usage:update' }
    }))
  }
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    
    if (data.type === 'usage:update') {
      usage.value = { ...usage.value, ...data.data }
      
      // Add to recent activity
      recentActivity.value.unshift({
        action: data.data.action || 'AI Request',
        time: 'just now',
        type: data.data.error ? 'error' : 'success'
      })
      
      // Keep only last 10
      if (recentActivity.value.length > 10) {
        recentActivity.value = recentActivity.value.slice(0, 10)
      }
    }
    
    if (data.type === 'provider:switch') {
      currentProvider.value = data.data
    }
  }
  
  ws.onclose = () => {
    // Reconnect after 3 seconds
    reconnectInterval = window.setTimeout(connectWebSocket, 3000)
  }
}

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

onMounted(() => {
  connectWebSocket()
  
  // Fetch initial usage
  fetchUsage()
})

onUnmounted(() => {
  if (ws) ws.close()
  if (reconnectInterval) clearTimeout(reconnectInterval)
})

const fetchUsage = async () => {
  try {
    const res = await fetch('/api/usage', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    
    if (res.ok) {
      const data = await res.json()
      usage.value = { ...usage.value, ...data.today }
    }
  } catch (err) {
    console.error('Failed to fetch usage:', err)
  }
}

defineEmits(['upgrade'])
</script>
