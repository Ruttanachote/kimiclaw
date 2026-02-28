<template>
  <div class="flex items-center gap-2">
    <span 
      class="w-3 h-3 rounded-full animate-pulse"
      :class="statusClass"
    ></span>
    <span class="text-sm font-medium capitalize">{{ displayStatus }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: string
}>()

const statusClass = computed(() => {
  switch (props.status) {
    case 'idle':
      return 'bg-green-500'
    case 'busy':
      return 'bg-yellow-500'
    case 'error':
      return 'bg-red-500'
    case 'offline':
      return 'bg-slate-500'
    case 'connecting':
      return 'bg-blue-500 animate-pulse'
    default:
      return 'bg-slate-500'
  }
})

const displayStatus = computed(() => {
  switch (props.status) {
    case 'idle':
      return 'Agent Ready'
    case 'busy':
      return 'Working...'
    case 'error':
      return 'Error'
    case 'offline':
      return 'Offline'
    case 'connecting':
      return 'Connecting...'
    default:
      return props.status
  }
})
</script>
