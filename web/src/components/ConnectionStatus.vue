<template>
  <div class="flex items-center gap-2">
    <span 
      class="w-3 h-3 rounded-full"
      :class="connected ? 'bg-green-500' : 'bg-red-500'"
    ></span>
    <span class="text-sm">
      {{ connected ? 'เชื่อมต่อแล้ว' : 'ขาดการเชื่อมต่อ' }}
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  connected: boolean
}>()
</script>
