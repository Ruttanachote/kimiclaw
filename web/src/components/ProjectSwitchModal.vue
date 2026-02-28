<template>
  <div v-if="visible" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div class="card w-full max-w-md">
      <div class="text-center mb-6">
        <div class="text-5xl mb-4">🔄</div>
        
        <h2 class="text-xl font-bold">Switching Project</h2>
        
        <p class="text-slate-400 mt-2">
          กำลังสลับจาก "{{ fromProject }}" ไป "{{ toProject }}"
        </p>
      </div>

      <!-- Progress Steps -->
      <div class="space-y-3 mb-6">
        <div
          v-for="(step, i) in steps"
          :key="i"
          class="flex items-center gap-3 p-3 rounded-lg"
          :class="getStepClass(step.status)"
        >
          <span class="text-xl">{{ getStepIcon(step.status) }}</span>
          
          <div class="flex-1">
            <p class="font-medium">{{ step.name }}</p>
            <p v-if="step.detail" class="text-xs opacity-70">{{ step.detail }}</p>
          </div>
        </div>
      </div>

      <!-- What happens -->
      <div class="bg-slate-800 rounded-lg p-4 mb-6">
        <p class="font-medium mb-2">📋 สิ่งที่เกิดขึ้น:</p>
        
        <ul class="text-sm text-slate-400 space-y-1">
          <li>✓ AI Agents จะลืม context ของโปรเจกเก่า</li>
          <li>✓ Memory ใหม่จะโหลดสำหรับ "{{ toProject }}"</li>
          <li>✓ ประวัติแชทจะถูกเก็บแยกตามโปรเจก</li>
          <li>✓ Agents จะเริ่มต้นด้วย Default Memory ใหม่</li>
        </ul>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button 
          v-if="!isComplete"
          @click="cancel"
          :disabled="isProcessing"
          class="btn btn-secondary flex-1"
        >
          Cancel
        </button>
        
        <button 
          v-else
          @click="done"
          class="btn btn-primary flex-1"
        >
          Continue
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  visible: boolean
  fromProject: string
  toProject: string
}>()

const emit = defineEmits(['complete', 'cancel'])

const isProcessing = ref(true)
const isComplete = ref(false)

const steps = ref([
  { name: 'Archive old project context', status: 'pending', detail: '' },
  { name: 'Clear agent memories', status: 'pending', detail: '' },
  { name: 'Load new project settings', status: 'pending', detail: '' },
  { name: 'Initialize agent memories', status: 'pending', detail: '' },
  { name: 'Notify all agents', status: 'pending', detail: '' }
])

const getStepClass = (status: string) => {
  const classes = {
    pending: 'bg-slate-800 text-slate-500',
    processing: 'bg-blue-900/30 text-blue-400 border border-blue-700',
    complete: 'bg-green-900/30 text-green-400 border border-green-700'
  }
  return classes[status] || classes.pending
}

const getStepIcon = (status: string) => {
  const icons = {
    pending: '○',
    processing: '◐',
    complete: '✓'
  }
  return icons[status] || icons.pending
}

onMounted(async () => {
  // Simulate switching process
  for (let i = 0; i < steps.value.length; i++) {
    steps.value[i].status = 'processing'
    
    // Simulate work
    await new Promise(r => setTimeout(r, 800))
    
    steps.value[i].status = 'complete'
    
    if (i === 0) steps.value[i].detail = 'Saved to archive'
    if (i === 1) steps.value[i].detail = 'Cleared from Redis'
    if (i === 2) steps.value[i].detail = 'Loaded tech stack preferences'
    if (i === 3) steps.value[i].detail = '8 agents initialized'
    if (i === 4) steps.value[i].detail = 'All agents notified'
  }
  
  isProcessing.value = false
  isComplete.value = true
  
  setTimeout(() => {
    emit('complete')
  }, 1000)
})

const cancel = () => {
  emit('cancel')
}

const done = () => {
  emit('complete')
}
</script>
