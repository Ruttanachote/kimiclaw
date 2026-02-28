<template>
  <div class="card">
    <div class="flex items-center gap-2 mb-4">
      <span class="text-2xl">📊</span>
      <h2 class="text-lg font-semibold">งานที่กำลังทำ</h2>
    </div>

    <div v-if="tasks.length === 0" class="text-center py-8 text-slate-500">
      <p>ไม่มีงานที่กำลังทำ</p>
    </div>

    <div v-else class="space-y-3">
      <div 
        v-for="task in tasks" 
        :key="task.id"
        class="p-3 rounded-lg bg-slate-800 border border-slate-700"
      >
        <div class="flex items-center justify-between">
          <span class="font-medium">{{ task.title }}</span>
          <span class="text-xs px-2 py-1 rounded bg-blue-700">
            {{ task.status }}
          </span>
        </div>
        
        <div v-if="task.progress" class="mt-2">
          <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              class="h-full bg-blue-500"
              :style="{ width: `${task.progress}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  tasks: any[]
}>()
</script>
