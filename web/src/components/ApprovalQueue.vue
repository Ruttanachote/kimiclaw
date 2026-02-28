<template>
  <div class="card">
    <div class="flex items-center gap-2 mb-4">
      <span class="text-2xl">⏳</span>
      <h2 class="text-lg font-semibold">Approval Queue</h2>
      <span class="ml-auto bg-yellow-600 px-2 py-1 rounded text-sm">{{ approvals.length }}</span>
    </div>

    <div class="space-y-3 max-h-[300px] overflow-y-auto">
      <div 
        v-for="a in approvals" 
        :key="a.id"
        class="p-3 rounded-lg border border-yellow-700 bg-yellow-900/20"
      >
        <div class="flex items-center gap-2 mb-2">
          <span class="font-medium">{{ a.type }}</span>
          <span class="text-slate-400 text-sm">→ {{ a.agent_name }}</span>
        </div>
        
        <p class="text-sm text-slate-300 mb-2">{{ a.reason }}</p>
        
        <div v-if="a.cost_estimate" class="text-xs text-slate-400 mb-2">
          Cost: {{ a.cost_estimate }}
        </div>
        
        <div class="flex gap-2">
          <button @click="$emit('approve', a.id)" class="btn btn-primary text-sm flex-1">✓ Approve</button>
          <button @click="$emit('reject', a.id)" class="btn btn-secondary text-sm flex-1">✕ Reject</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ approvals: any[] }>()
defineEmits(['approve', 'reject'])
</script>
