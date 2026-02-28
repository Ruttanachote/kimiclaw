<template>
  <div class="card flex flex-col h-[400px]">
    <div class="flex items-center gap-2 mb-4">
      <span class="text-2xl">💬</span>
      <h2 class="text-lg font-semibold">เลขาส่วนตัว</h2>
    </div>

    <!-- Messages -->
    <div ref="chatContainer" class="flex-1 overflow-y-auto space-y-3 mb-4">
      <div 
        v-for="(msg, i) in messages" 
        :key="i"
        class="flex"
        :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div 
          class="max-w-[80%] p-3 rounded-lg"
          :class="msg.role === 'user' 
            ? 'bg-blue-600 text-white' 
            : 'bg-slate-700 text-slate-200'"
        >
          <p class="whitespace-pre-wrap">{{ msg.content }}</p>
          <p class="text-xs opacity-70 mt-1">
            {{ formatTime(msg.timestamp) }}
          </p>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="messages.length === 0" class="text-center text-slate-500 py-8">
        <p>สวัสดีค่ะ ฉันเป็นเลขาส่วนตัวของคุณ</p>
        <p class="text-sm mt-2">ลองพิมพ์ "สร้างโปรเจก" หรือ "หาข้อมูล" ได้เลย</p>
      </div>
    </div>

    <!-- Input -->
    <div class="flex gap-2">
      <input
        v-model="inputMessage"
        @keypress.enter="send"
        type="text"
        placeholder="พิมพ์ข้อความ..."
        class="input flex-1"
      />
      <button 
        @click="send"
        :disabled="!inputMessage.trim()"
        class="btn btn-primary"
        :class="{ 'opacity-50': !inputMessage.trim() }"
      >
        ส่ง
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  messages: any[]
}>()

const emit = defineEmits(['send-message'])

const inputMessage = ref('')
const chatContainer = ref<HTMLDivElement | null>(null)

const send = () => {
  const msg = inputMessage.value.trim()
  if (!msg) return
  
  emit('send-message', msg)
  inputMessage.value = ''
}

const formatTime = (timestamp: string) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

// Auto scroll to bottom
watch(() => props.messages, () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}, { deep: true })
</script>
