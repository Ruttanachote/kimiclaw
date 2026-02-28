<template>
  <div class="card">
    <div class="flex items-center gap-2 mb-4">
      <span class="text-2xl">👥</span>
      <h2 class="text-lg font-semibold">Agents</h2>
    </div>

    <div class="space-y-3">
      <div 
        v-for="(agent, name) in agents" 
        :key="name"
        class="p-3 rounded-lg border border-slate-700 bg-slate-800/50"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xl">{{ getAgentIcon(agent.type) }}</span>
            <div>
              <p class="font-medium capitalize">{{ name }}</p>
              <p class="text-xs text-slate-400">{{ agent.type }}</p>
            </div>
          </div>
          
          <span 
            class="w-2 h-2 rounded-full"
            :class="getStatusColor(agent.status)"
          ></span>
        </div>

        <!-- Progress bar -->
        <div v-if="agent.progress > 0 && agent.progress < 100" class="mt-2">
          <div class="h-1 bg-slate-700 rounded-full overflow-hidden">
            <div 
              class="h-full bg-blue-500 transition-all duration-500"
              :style="{ width: `${agent.progress}%` }"
            ></div>
          </div>
          <p class="text-xs text-slate-400 mt-1">{{ agent.progress }}%</p>
        </div>

        <!-- Capabilities -->
        <div v-if="agent.capabilities" class="mt-2 flex flex-wrap gap-1">
          <span 
            v-for="cap in agent.capabilities.slice(0, 3)" 
            :key="cap"
            class="text-xs bg-slate-700 px-2 py-0.5 rounded"
          >
            {{ cap }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  agents: Record<string, any>
}>()

const getAgentIcon = (type: string) => {
  const icons: Record<string, string> = {
    research: '🔍',
    frontend: '⚛️',
    backend: '🔧',
    uiux: '🎨',
    qa: '🧪',
    pmba: '📊',
    supervisor: '👁️',
    secretary: '💬'
  }
  return icons[type] || '🤖'
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    idle: 'bg-green-500',
    busy: 'bg-yellow-500',
    offline: 'bg-slate-500',
    error: 'bg-red-500'
  }
  return colors[status] || 'bg-slate-500'
}
</script>
