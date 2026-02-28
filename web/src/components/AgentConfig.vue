<template>
  <div class="card">
    <div class="flex items-center gap-2 mb-4">
      <span class="text-2xl">⚙️</span>
      <h2 class="text-lg font-semibold">Agent Config</h2>
    </div>

    <div v-if="agent" class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="text-slate-400">Name</span>
        <span class="font-medium">{{ agent.name }}</span>
      </div>

      <div class="flex items-center justify-between">
        <span class="text-slate-400">Type</span>
        <span class="capitalize">{{ agent.type }}</span>
      </div>

      <div class="flex items-center justify-between">
        <span class="text-slate-400">Status</span>
        <span 
          class="px-2 py-1 rounded text-sm"
          :class="getStatusClass(agent.status)"
        >
          {{ agent.status }}
        </span>
      </div>

      <div class="flex items-center justify-between">
        <span class="text-slate-400">Model</span>
        <span>{{ agent.modelProvider || 'local' }}</span>
      </div>

      <!-- Capabilities -->
      <div>
        <p class="text-slate-400 mb-2">Capabilities</p>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="cap in agent.capabilities"
            :key="cap"
            class="text-xs bg-slate-700 px-2 py-1 rounded"
          >
            {{ cap }}
          </span>
        </div>
      </div>

      <!-- Upgrade -->
      <div class="pt-4 border-t border-slate-700">
        <p class="text-slate-400 mb-3">Upgrade</p>
        
        <div class="space-y-2">
          <button 
            @click="upgrade('memory')"
            class="w-full btn btn-secondary text-sm"
          >
            ⬆️ Increase Memory
          </button>
          
          <button 
            @click="upgrade('capability')"
            class="w-full btn btn-secondary text-sm"
          >
            ➕ Add Capability
          </button>
          
          <button 
            @click="upgrade('restart')"
            class="w-full btn btn-secondary text-sm"
          >
            🔄 Restart Agent
          </button>
        </div>
      </div>
    </div>

    <div v-else class="text-center text-slate-500 py-8">
      <p>เลือก Agent เพื่อดู Config</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  agent: any
}>()

const emit = defineEmits(['upgrade'])

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    idle: 'bg-green-600',
    busy: 'bg-yellow-600',
    offline: 'bg-slate-600',
    error: 'bg-red-600',
    creating: 'bg-blue-600'
  }
  return classes[status] || 'bg-slate-600'
}

const upgrade = (type: string) => {
  const upgrades: any = {}
  
  if (type === 'memory') {
    upgrades.resources = { memory: '1g' }
  } else if (type === 'capability') {
    upgrades.capabilities = ['new-skill']
  } else if (type === 'restart') {
    upgrades.restart = true
  }
  
  emit('upgrade', { name: props.agent.name, upgrades })
}
</script>
