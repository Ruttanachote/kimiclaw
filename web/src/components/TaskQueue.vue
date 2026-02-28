<template>
  <div class="card">
    <div class="flex items-center gap-2 mb-4">
      <span class="text-2xl">📋</span>
      <h2 class="text-lg font-semibold">Task Queue</h2>
      <span class="ml-auto bg-slate-700 px-2 py-1 rounded text-sm">
        {{ tasks.length }}
      </span>
    </div>

    <div v-if="tasks.length === 0" class="text-center py-8 text-slate-500">
      <div class="text-4xl mb-2">📝</div>
      <p>No tasks yet</p>
      <p class="text-sm">Send a command to get started</p>
    </div>

    <div v-else class="space-y-3 max-h-[300px] overflow-y-auto">
      <div 
        v-for="task in tasks" 
        :key="task.id"
        class="p-3 rounded-lg border"
        :class="{
          'bg-slate-800 border-slate-700': task.status === 'pending',
          'bg-blue-900/20 border-blue-700': task.status === 'running',
          'bg-green-900/20 border-green-700': task.status === 'completed',
          'bg-red-900/20 border-red-700': task.status === 'error'
        }"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span>{{ getActionIcon(task.action) }}</span>
            <span class="font-medium capitalize">{{ task.action }}</span>
          </div>
          <span 
            class="text-xs px-2 py-1 rounded"
            :class="{
              'bg-slate-700': task.status === 'pending',
              'bg-blue-700': task.status === 'running',
              'bg-green-700': task.status === 'completed',
              'bg-red-700': task.status === 'error'
            }"
          >
            {{ task.status }}
          </span>
        </div>
        
        <div v-if="task.params" class="mt-2 text-sm text-slate-400">
          <code class="bg-slate-900 px-2 py-1 rounded">
            {{ formatParams(task.params) }}
          </code>
        </div>
        
        <div class="mt-2 text-xs text-slate-500">
          {{ task.timestamp }}
        </div>

        <!-- Result -->
        <div v-if="task.result" class="mt-2 p-2 bg-slate-900 rounded text-sm">
          <span class="text-green-400">✓ {{ task.result }}</span>
        </div>
        
        <div v-if="task.error" class="mt-2 p-2 bg-slate-900 rounded text-sm">
          <span class="text-red-400">✗ {{ task.error }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  tasks: any[]
}>()

const getActionIcon = (action: string) => {
  const icons: Record<string, string> = {
    browse: '🌐',
    search: '🔍',
    click: '👆',
    type: '⌨️',
    screenshot: '📸',
    scroll: '📜',
    read: '📖'
  }
  return icons[action] || '❓'
}

const formatParams = (params: any) => {
  const relevant = { ...params }
  delete relevant.action
  delete relevant.timestamp
  return JSON.stringify(relevant).slice(0, 50) + '...'
}
</script>
