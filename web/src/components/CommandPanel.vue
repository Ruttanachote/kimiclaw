<template>
  <div class="card">
    <div class="flex items-center gap-2 mb-4">
      <span class="text-2xl">🎯</span>
      <h2 class="text-lg font-semibold">Command Center</h2>
    </div>

    <!-- Action Selector -->
    <div class="space-y-4">
      <div>
        <label class="block text-sm text-slate-400 mb-2">Action</label>
        <select v-model="selectedAction" class="input">
          <option value="browse">🌐 Browse URL</option>
          <option value="search">🔍 Search Google</option>
          <option value="click">👆 Click Element</option>
          <option value="type">⌨️ Type Text</option>
          <option value="screenshot">📸 Screenshot</option>
          <option value="scroll">📜 Scroll Page</option>
          <option value="read">📖 Read Content</option>
        </select>
      </div>

      <!-- Dynamic Inputs -->
      <div v-if="selectedAction === 'browse'">
        <label class="block text-sm text-slate-400 mb-2">URL</label>
        <input 
          v-model="params.url" 
          type="text" 
          placeholder="https://example.com"
          class="input"
        />
      </div>

      <div v-if="selectedAction === 'search'">
        <label class="block text-sm text-slate-400 mb-2">Search Query</label>
        <input 
          v-model="params.query" 
          type="text" 
          placeholder="Flutter best practices"
          class="input"
        />
      </div>

      <div v-if="selectedAction === 'click'">
        <label class="block text-sm text-slate-400 mb-2">CSS Selector</label>
        <input 
          v-model="params.selector" 
          type="text" 
          placeholder="button.submit"
          class="input"
        />
      </div>

      <div v-if="selectedAction === 'type'">
        <label class="block text-sm text-slate-400 mb-2">CSS Selector</label>
        <input 
          v-model="params.selector" 
          type="text" 
          placeholder="input[name='email']"
          class="input mb-3"
        />
        <label class="block text-sm text-slate-400 mb-2">Text</label>
        <input 
          v-model="params.text" 
          type="text" 
          placeholder="Hello World"
          class="input"
        />
      </div>

      <div v-if="selectedAction === 'screenshot'">
        <label class="block text-sm text-slate-400 mb-2">Filename (optional)</label>
        <input 
          v-model="params.filename" 
          type="text" 
          placeholder="screenshot.png"
          class="input"
        />
      </div>

      <div v-if="selectedAction === 'scroll'">
        <label class="block text-sm text-slate-400 mb-2">Direction</label>
        <select v-model="params.direction" class="input">
          <option value="down">⬇️ Down</option>
          <option value="up">⬆️ Up</option>
          <option value="bottom">⏭️ To Bottom</option>
        </select>
      </div>

      <!-- Send Button -->
      <button 
        @click="sendCommand"
        :disabled="!canSend"
        class="btn btn-primary w-full mt-4"
        :class="{ 'opacity-50 cursor-not-allowed': !canSend }"
      >
        🚀 Send Command
      </button>
    </div>

    <!-- Quick Actions -->
    <div class="mt-6 pt-6 border-t border-slate-700">
      <p class="text-sm text-slate-400 mb-3">Quick Actions</p>
      <div class="flex flex-wrap gap-2">
        <button 
          @click="quickAction('browse', { url: 'https://google.com' })"
          class="btn btn-secondary text-sm"
        >
          Google
        </button>
        <button 
          @click="quickAction('browse', { url: 'https://github.com' })"
          class="btn btn-secondary text-sm"
        >
          GitHub
        </button>
        <button 
          @click="quickAction('screenshot')"
          class="btn btn-secondary text-sm"
        >
          📸 Screenshot
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const emit = defineEmits(['send-command'])

const selectedAction = ref('browse')
const params = ref({
  url: '',
  query: '',
  selector: '',
  text: '',
  filename: '',
  direction: 'down'
})

const canSend = computed(() => {
  switch (selectedAction.value) {
    case 'browse':
      return !!params.value.url
    case 'search':
      return !!params.value.query
    case 'click':
      return !!params.value.selector
    case 'type':
      return !!params.value.selector && !!params.value.text
    case 'screenshot':
    case 'scroll':
    case 'read':
      return true
    default:
      return false
  }
})

const sendCommand = () => {
  const command: any = {
    action: selectedAction.value,
    timestamp: new Date().toISOString()
  }

  // Add relevant params
  switch (selectedAction.value) {
    case 'browse':
      command.url = params.value.url
      break
    case 'search':
      command.query = params.value.query
      break
    case 'click':
      command.selector = params.value.selector
      break
    case 'type':
      command.selector = params.value.selector
      command.text = params.value.text
      break
    case 'screenshot':
      if (params.value.filename) command.filename = params.value.filename
      break
    case 'scroll':
      command.direction = params.value.direction
      break
  }

  emit('send-command', command)
  
  // Clear inputs
  params.value = {
    url: '',
    query: '',
    selector: '',
    text: '',
    filename: '',
    direction: 'down'
  }
}

const quickAction = (action: string, extraParams = {}) => {
  emit('send-command', {
    action,
    ...extraParams,
    timestamp: new Date().toISOString()
  })
}
</script>
