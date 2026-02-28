<template>
  <div v-if="visible" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="card flex items-center gap-4">
      <div class="animate-spin text-3xl">⏳</div>
      <div>
        <p class="font-medium">{{ message }}</p>
        <p v-if="subMessage" class="text-sm text-slate-400">{{ subMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  message: string
  subMessage?: string
}>()
</script>
