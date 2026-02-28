<template>
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="text-2xl">📈</span>
        <h2 class="text-lg font-semibold">Agent Health</h2>
      </div>
      
      <button @click="refresh" class="text-slate-400 hover:text-white">
        🔄
      </button>
    </div>

    <!-- CPU & Memory -->
    <div class="space-y-4">
      <div v-for="metric in metrics" :key="metric.name">
        <div class="flex items-center justify-between mb-1">
          <span class="text-sm">{{ metric.name }}</span>
          <span class="text-sm" :class="getValueColor(metric)">
            {{ metric.value }}{{ metric.unit }}
          </span>
        </div>
        
        <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            class="h-full rounded-full transition-all duration-500"
            :class="getBarColor(metric)"
            :style="{ width: `${Math.min(metric.percent, 100)}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Status summary -->
    <div class="mt-6 pt-4 border-t border-slate-700">
      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <p class="text-2xl font-bold text-green-500">{{ healthyCount }}</p>
          <p class="text-xs text-slate-400">Healthy</p>
        </div>
        
        <div>
          <p class="text-2xl font-bold text-yellow-500">{{ busyCount }}</p>
          <p class="text-xs text-slate-400">Busy</p>
        </div>
        
        <div>
          <p class="text-2xl font-bold text-red-500">{{ errorCount }}</p>
          <p class="text-xs text-slate-400">Issues</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  agents: Record<string, any>
}>()

const metrics = ref([
  { name: 'CPU Usage', value: 45, unit: '%', percent: 45 },
  { name: 'Memory', value: 2.4, unit: 'GB', percent: 60 },
  { name: 'Disk', value: 15, unit: 'GB', percent: 30 },
  { name: 'Network', value: 12, unit: 'MB/s', percent: 25 }
])

const healthyCount = computed(() => {
  return Object.values(props.agents).filter((a: any) => a.status === 'idle').length
})

const busyCount = computed(() => {
  return Object.values(props.agents).filter((a: any) => a.status === 'busy').length
})

const errorCount = computed(() => {
  return Object.values(props.agents).filter((a: any) => a.status === 'error' || a.status === 'offline').length
})

const getValueColor = (metric: any) => {
  if (metric.percent > 80) return 'text-red-500'
  if (metric.percent > 60) return 'text-yellow-500'
  return 'text-green-500'
}

const getBarColor = (metric: any) => {
  if (metric.percent > 80) return 'bg-red-500'
  if (metric.percent > 60) return 'bg-yellow-500'
  return 'bg-green-500'
}

const refresh = () => {
  // Fetch metrics from API
}
</script>
