<template>
  <div class="card h-[600px] flex flex-col">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="text-2xl">💬</span>
        <h2 class="text-lg font-semibold">Live Conversation</h2>
      </div>
      
      <button 
        @click="clearMessages"
        class="text-sm text-slate-400 hover:text-white"
      >
        ล้าง
      </button>
    </div>

    <!-- Conversation -->
    <div class="flex-1 overflow-y-auto space-y-3">
      <div 
        v-for="(msg, i) in messages" 
        :key="i"
        class="p-3 rounded-lg border"
        :class="getMessageClass(msg)"
      >
        <div class="flex items-center gap-2 mb-2">
          <span class="font-medium">{{ msg.from_agent || msg.from }}</span>
          <span v-if="msg.to_agent || msg.to" class="text-slate-400">
            → {{ msg.to_agent || msg.to }}
          </span>
          <span class="ml-auto text-xs text-slate-500">
            {{ formatTime(msg.timestamp) }}
          </span>
        </div>
        
        <p class="text-sm whitespace-pre-wrap">{{ msg.content || msg.message }}</p>
        
        <div v-if="msg.context" class="mt-2 text-xs text-slate-400">
          <code class="bg-slate-900 px-2 py-1 rounded">
            {{ JSON.stringify(msg.context).slice(0, 100) }}...
          </code>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="messages.length === 0" class="text-center text-slate-500 py-12">
        <div class="text-4xl mb-4">🤫</div>
        <p>ยังไม่มีการสนทนา</p>
        <p class="text-sm mt-2">Agents จะคุยกันที่นี่เมื่อมีงาน</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  messages: any[]
}>()

const getMessageClass = (msg: any) => {
  const from = msg.from_agent || msg.from
  
  if (from === 'secretary-agent') {
    return 'bg-blue-900/20 border-blue-700'
  }
  if (from === 'research-agent') {
    return 'bg-green-900/20 border-green-700'
  }
  if (from === 'frontend-agent') {
    return 'bg-purple-900/20 border-purple-700'
  }
  if (from === 'user') {
    return 'bg-slate-700 border-slate-600'
  }
  return 'bg-slate-800 border-slate-700'
}

const formatTime = (timestamp: string) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('th-TH', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  })
}

const clearMessages = () => {
  // This would need to be handled by parent
  console.log('Clear messages')
}
</script>
