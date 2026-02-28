<template>
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="text-2xl">⚡</span>
        <h2 class="text-lg font-semibold">Quick Actions</h2>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <button 
        v-for="action in actions" 
        :key="action.id"
        @click="execute(action)"
        class="p-4 rounded-lg border border-slate-700 hover:border-blue-500 hover:bg-slate-800 transition-all text-left"
        :disabled="action.loading"
        :class="{ 'opacity-50': action.loading }"
      >
        <div class="flex items-center gap-3">
          <span class="text-2xl">{{ action.icon }}</span>
          
          <div>
            <p class="font-medium">{{ action.name }}</p>
            <p class="text-xs text-slate-400">{{ action.description }}</p>
          </div>
        </div>

        <div v-if="action.loading" class="mt-2">
          <div class="h-1 bg-slate-700 rounded-full overflow-hidden">
            <div class="h-full bg-blue-500 animate-pulse w-3/4"></div>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const actions = ref([
  {
    id: 'research',
    name: 'Quick Research',
    description: 'Search web for info',
    icon: '🔍',
    loading: false
  },
  {
    id: 'create-project',
    name: 'New Project',
    description: 'Create from template',
    icon: '📁',
    loading: false
  },
  {
    id: 'generate-code',
    name: 'Generate Code',
    description: 'Create component',
    icon: '⚡',
    loading: false
  },
  {
    id: 'run-tests',
    name: 'Run Tests',
    description: 'Test current project',
    icon: '🧪',
    loading: false
  },
  {
    id: 'export-report',
    name: 'Export Report',
    description: 'Excel or PowerPoint',
    icon: '📊',
    loading: false
  },
  {
    id: 'security-scan',
    name: 'Security Scan',
    description: 'ZAP security test',
    icon: '🔒',
    loading: false
  }
])

const execute = async (action: any) => {
  action.loading = true
  
  // Simulate action
  setTimeout(() => {
    action.loading = false
    
    // Show toast notification
    if ((window as any).$toast) {
      (window as any).$toast({
        type: 'success',
        title: `${action.name} completed`,
        duration: 3000
      })
    }
  }, 2000)
}
</script>
