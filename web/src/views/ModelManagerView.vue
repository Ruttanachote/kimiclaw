<template>
  <div class="min-h-screen bg-slate-950 p-6">
    <!-- Header -->
    <div class="max-w-7xl mx-auto mb-8">
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center gap-3">
            <span class="text-3xl">🤖</span>
            <div>
              <h1 class="text-2xl font-bold">AI Model Manager</h1>
              <p class="text-slate-400">Configure and manage your AI providers</p>
            </div>
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <button 
            @click="showAddProvider = true"
            class="btn btn-primary"
          >
            ➕ Add Provider
          </button>
          
          <button 
            @click="testAllConnections"
            class="btn btn-secondary"
            :disabled="testing"
          >
            {{ testing ? 'Testing...' : '🔄 Test All' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Provider Cards -->
    <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="provider in providers"
        :key="provider.id"
        class="card relative overflow-hidden"
        :class="{ 'border-2 border-green-500': provider.connected, 'border-2 border-red-500': provider.error }"
      >
        <!-- Status indicator -->
        <div 
          class="absolute top-4 right-4 w-3 h-3 rounded-full"
          :class="getStatusColor(provider.status)"
          :title="provider.status"
        ></div>

        <!-- Header -->
        <div class="flex items-center gap-3 mb-4">
          <span class="text-3xl">{{ provider.icon }}</span>
          <div>
            <h3 class="font-bold">{{ provider.name }}</h3>
            <p class="text-xs text-slate-400">{{ provider.description }}</p>
          </div>
        </div>

        <!-- Connection info -->
        <div v-if="provider.connected" class="mb-4 p-3 bg-green-900/30 rounded-lg">
          <div class="flex items-center justify-between">
            <span class="text-sm text-green-400">✓ Connected</span>
            <span class="text-xs text-slate-400">{{ provider.models.length }} models</span>
          </div>
          
          <div v-if="provider.usage" class="mt-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400">Usage today</span>
              <span>{{ provider.usage.today }} / {{ provider.usage.limit }}</span>
            </div>
            <div class="mt-1 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div 
                class="h-full bg-green-500"
                :style="{ width: `${(provider.usage.today / provider.usage.limit) * 100}%` }"
              ></div>
            </div>
          </div>
        </div>

        <div v-else class="mb-4 p-3 bg-slate-800 rounded-lg">
          <p class="text-sm text-slate-400">Not connected</p>
          <p class="text-xs text-slate-500 mt-1">Add API key to use this provider</p>
        </div>

        <!-- Models list -->
        <div class="mb-4">
          <p class="text-sm font-medium mb-2">Available Models</p>
          
          <div class="space-y-2 max-h-40 overflow-y-auto">
            <div
              v-for="model in provider.models"
              :key="model.id"
              class="flex items-center justify-between p-2 rounded bg-slate-800/50"
              :class="{ 'ring-1 ring-blue-500': isDefaultModel(provider.id, model.id) }"
            >
              <div class="flex items-center gap-2">
                <input 
                  type="radio"
                  :name="`default-${provider.id}`"
                  :checked="isDefaultModel(provider.id, model.id)"
                  @change="setDefaultModel(provider.id, model.id)"
                  class="accent-blue-500"
                />
                <div>
                  <p class="text-sm">{{ model.name }}</p>
                  <p class="text-xs text-slate-500">{{ formatContext(model.context) }} context</p>
                </div>
              </div>
              
              <span class="text-xs text-slate-400">${{ model.pricing.input }}/1M tokens</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <button 
            v-if="!provider.connected"
            @click="connectProvider(provider)"
            class="btn btn-primary flex-1 text-sm"
          >
            Connect
          </button>
          
          <button 
            v-else
            @click="disconnectProvider(provider)"
            class="btn btn-secondary flex-1 text-sm"
          >
            Disconnect
          </button>
          
          <button 
            @click="testConnection(provider)"
            class="btn btn-secondary text-sm"
            :disabled="provider.testing"
          >
            {{ provider.testing ? '...' : 'Test' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Smart Routing -->
    <div class="max-w-7xl mx-auto mt-8">
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-lg font-semibold">🧠 Smart Routing</h2>
            <p class="text-sm text-slate-400">Automatically select the best model based on your needs</p>
          </div>
          
          <label class="flex items-center gap-2 cursor-pointer">
            <input 
              v-model="smartRouting.enabled"
              type="checkbox"
              class="w-5 h-5 accent-blue-500"
            />
            <span>Enable Smart Routing</span>
          </label>
        </div>

        <div v-if="smartRouting.enabled" class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 bg-slate-800 rounded-lg">
            <p class="font-medium mb-2">💰 Cost Optimization</p>
            <p class="text-sm text-slate-400">Use cheapest model that meets requirements</p>
            <select v-model="smartRouting.costPriority" class="mt-2 input text-sm">
              <option value="high">High (Save money)</option>
              <option value="medium">Balanced</option>
              <option value="low">Low (Best quality)</option>
            </select>
          </div>

          <div class="p-4 bg-slate-800 rounded-lg">
            <p class="font-medium mb-2">⚡ Speed Priority</p>
            <p class="text-sm text-slate-400">Prefer faster models for quick tasks</p>
            <select v-model="smartRouting.speedPriority" class="mt-2 input text-sm">
              <option value="high">High (Fastest)</option>
              <option value="medium">Balanced</option>
              <option value="low">Low (Don't care)</option>
            </select>
          </div>

          <div class="p-4 bg-slate-800 rounded-lg">
            <p class="font-medium mb-2">🔄 Fallback Chain</p>
            <p class="text-sm text-slate-400">Auto-switch if primary fails</p>
            <div class="mt-2 space-y-1">
              <div 
                v-for="(provider, i) in smartRouting.fallbackChain" 
                :key="provider"
                class="flex items-center gap-2 text-sm"
              >
                <span class="text-slate-500">{{ i + 1 }}.</span>
                <span>{{ getProviderName(provider) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Provider Modal -->
    <div v-if="showAddProvider" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="card w-full max-w-md">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold">Add AI Provider</h2>
          <button @click="showAddProvider = false" class="text-slate-400 hover:text-white">✕</button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm text-slate-400 mb-1">Select Provider</label>
            <select v-model="newProvider.id" class="input">
              <option v-for="p in availableProviders" :key="p.id" :value="p.id">
                {{ p.icon }} {{ p.name }}
              </option>
            </select>
          </div>

          <div v-if="newProvider.id">
            <div class="p-3 bg-slate-800 rounded-lg mb-4">
              <p class="text-sm">{{ getProviderInfo(newProvider.id)?.description }}</p>
              <a 
                :href="getProviderInfo(newProvider.id)?.docsUrl"
                target="_blank"
                class="text-sm text-blue-400 hover:text-blue-300"
              >
                Get API Key →
              </a>
            </div>

            <label class="block text-sm text-slate-400 mb-1">API Key</label>
            <input 
              v-model="newProvider.key"
              type="password"
              class="input"
              placeholder="sk-..."
            />
          </div>

          <div class="flex gap-3 mt-6">
            <button @click="showAddProvider = false" class="btn btn-secondary flex-1">Cancel</button>
            <button 
              @click="addProvider"
              :disabled="!newProvider.id || !newProvider.key"
              class="btn btn-primary flex-1"
              :class="{ 'opacity-50': !newProvider.id || !newProvider.key }"
            >
              Add Provider
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import providersConfig from '../../ai-proxy/config/providers.json'

const providers = ref([])
const availableProviders = ref(providersConfig.providers)
const showAddProvider = ref(false)
const testing = ref(false)

const newProvider = ref({
  id: '',
  key: ''
})

const smartRouting = ref({
  enabled: true,
  costPriority: 'medium',
  speedPriority: 'medium',
  fallbackChain: ['anthropic', 'openai', 'deepseek', 'ollama']
})

onMounted(() => {
  loadProviders()
})

const loadProviders = async () => {
  // Load from API
  const res = await fetch('/api/providers')
  if (res.ok) {
    providers.value = await res.json()
  }
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    connected: 'bg-green-500',
    disconnected: 'bg-slate-500',
    error: 'bg-red-500',
    testing: 'bg-yellow-500 animate-pulse'
  }
  return colors[status] || 'bg-slate-500'
}

const isDefaultModel = (providerId: string, modelId: string) => {
  // Check if this is the default model for this provider
  return false // TODO: implement
}

const setDefaultModel = (providerId: string, modelId: string) => {
  // Set as default
  console.log('Set default:', providerId, modelId)
}

const formatContext = (context: number) => {
  if (context >= 1000000) return (context / 1000000).toFixed(1) + 'M'
  if (context >= 1000) return (context / 1000).toFixed(0) + 'K'
  return context.toString()
}

const getProviderName = (id: string) => {
  const p = availableProviders.value.find(p => p.id === id)
  return p?.name || id
}

const getProviderInfo = (id: string) => {
  return availableProviders.value.find(p => p.id === id)
}

const connectProvider = async (provider: any) => {
  showAddProvider.value = true
  newProvider.value.id = provider.id
}

const disconnectProvider = async (provider: any) => {
  await fetch(`/api/providers/${provider.id}/disconnect`, { method: 'POST' })
  await loadProviders()
}

const testConnection = async (provider: any) => {
  provider.testing = true
  
  try {
    const res = await fetch(`/api/providers/${provider.id}/test`, { method: 'POST' })
    const data = await res.json()
    
    if (data.success) {
      provider.status = 'connected'
      provider.error = null
    } else {
      provider.status = 'error'
      provider.error = data.error
    }
  } finally {
    provider.testing = false
  }
}

const testAllConnections = async () => {
  testing.value = true
  
  for (const provider of providers.value) {
    if (provider.connected) {
      await testConnection(provider)
    }
  }
  
  testing.value = false
}

const addProvider = async () => {
  const res = await fetch('/api/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newProvider.value)
  })
  
  if (res.ok) {
    showAddProvider.value = false
    newProvider.value = { id: '', key: '' }
    await loadProviders()
  }
}
</script>
