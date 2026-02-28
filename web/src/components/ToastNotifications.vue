<template>
  <!-- Toast Notifications Container -->
  <div class="fixed top-4 right-4 z-50 space-y-2">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px]"
        :class="getToastClass(toast.type)"
      >
        <span class="text-xl">{{ getIcon(toast.type) }}</span>
        
        <div class="flex-1">
          <p class="font-medium">{{ toast.title }}</p>
          <p v-if="toast.message" class="text-sm opacity-90">{{ toast.message }}</p>
        </div>
        
        <button @click="remove(toast.id)" class="opacity-70 hover:opacity-100">
          ✕
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

const toasts = ref<Toast[]>([])

const getToastClass = (type: string) => {
  const classes = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-yellow-600 text-white',
    info: 'bg-blue-600 text-white'
  }
  return classes[type] || classes.info
}

const getIcon = (type: string) => {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠️',
    info: 'ℹ️'
  }
  return icons[type] || icons.info
}

const add = (toast: Omit<Toast, 'id'>) => {
  const id = Math.random().toString(36).substr(2, 9)
  const newToast = { ...toast, id }
  toasts.value.push(newToast)
  
  setTimeout(() => {
    remove(id)
  }, toast.duration || 5000)
}

const remove = (id: string) => {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

// Global toast function
onMounted(() => {
  (window as any).$toast = add
})

defineExpose({ add, remove })
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
