<template>
  <div v-if="visible" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold">➕ Create New Agent</h2>
        <button @click="$emit('close')" class="text-slate-400 hover:text-white">✕</button>
      </div>

      <!-- Step 1: Template -->
      <div v-if="step === 1" class="space-y-4">
        <p class="text-slate-400">เลือก Template:</p>
        
        <div class="grid grid-cols-2 gap-4">
          <button
            v-for="t in templates"
            :key="t.id"
            @click="selectTemplate(t)"
            class="p-4 rounded-lg border text-left transition-all"
            :class="selectedTemplate?.id === t.id 
              ? 'border-blue-500 bg-blue-900/20' 
              : 'border-slate-700 hover:border-slate-500'"
          >
            <p class="font-medium">{{ t.name }}</p>
            <p class="text-sm text-slate-400">{{ t.description }}</p>
          </button>
        </div>
      </div>

      <!-- Step 2: Configuration -->
      <div v-if="step === 2" class="space-y-4">
        <div>
          <label class="block text-sm text-slate-400 mb-1">ชื่อ Agent</label>
          <input v-model="config.name" type="text" class="input" placeholder="my-agent" />
        </div>

        <div>
          <label class="block text-sm text-slate-400 mb-1">AI Provider</label>
          <select v-model="config.modelProvider" class="input">
            <option v-for="p in models" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select>
        </div>

        <div v-if="selectedModelProvider">
          <label class="block text-sm text-slate-400 mb-1">Model</label>
          <select v-model="config.modelName" class="input">
            <option v-for="m in selectedModelProvider.models" :key="m" :value="m">
              {{ m }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm text-slate-400 mb-1">Memory (MB)</label>
          <input v-model.number="config.resources.memory" type="range" min="256" max="4096" step="256" class="w-full" />
          <p class="text-right text-sm">{{ config.resources.memory }} MB</p>
        </div>

        <div>
          <label class="block text-sm text-slate-400 mb-1">Capabilities</label>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="cap in availableCapabilities"
              :key="cap"
              @click="toggleCapability(cap)"
              class="px-3 py-1 rounded-full text-sm cursor-pointer transition-all"
              :class="config.capabilities.includes(cap) 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-300'"
            >
              {{ cap }}
            </span>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex justify-between mt-6 pt-6 border-t border-slate-700">
        <button 
          v-if="step > 1" 
          @click="step--" 
          class="btn btn-secondary"
        >
          ← Back
        </button>
        <div v-else></div>

        <button 
          v-if="step < 2" 
          @click="step++" 
          class="btn btn-primary"
          :disabled="!selectedTemplate"
        >
          Next →
        </button>

        <button 
          v-else 
          @click="create" 
          class="btn btn-primary"
          :disabled="!canCreate"
        >
          🚀 Create Agent
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  visible: boolean
  templates: any[]
  models: any[]
}>()

const emit = defineEmits(['create', 'close'])

const step = ref(1)
const selectedTemplate = ref(null)
const config = ref({
  name: '',
  type: 'custom',
  modelProvider: 'local',
  modelName: 'none',
  resources: { memory: 512, cpu: 0.5 },
  capabilities: []
})

const availableCapabilities = [
  'browse', 'search', 'code', 'test', 'deploy', 
  'analyze', 'chat', 'summarize', 'translate'
]

const selectedModelProvider = computed(() => {
  return props.models.find(p => p.id === config.value.modelProvider)
})

const canCreate = computed(() => {
  return config.value.name && config.value.name.length >= 3
})

const selectTemplate = (t) => {
  selectedTemplate.value = t
  config.value.type = t.id
  config.value.name = `${t.id}-agent-${Date.now().toString().slice(-4)}`
}

const toggleCapability = (cap) => {
  const idx = config.value.capabilities.indexOf(cap)
  if (idx > -1) {
    config.value.capabilities.splice(idx, 1)
  } else {
    config.value.capabilities.push(cap)
  }
}

const create = () => {
  emit('create', { ...config.value })
}
</script>
