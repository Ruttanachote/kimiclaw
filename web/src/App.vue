<template>
  <div class="min-h-screen bg-slate-950">
    <!-- Header -->
    <header class="bg-slate-900 border-b border-slate-800">
      <div class="max-w-7xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <span class="text-xl">🤖</span>
            </div>
            <div>
              <h1 class="text-xl font-bold text-white">AI DevStudio</h1>
              <p class="text-sm text-slate-400">Phase 4 - Complete</p>
            </div>
          </div>
          
          <div class="flex items-center gap-4">
            <!-- Project Switcher -->
            <select 
              v-model="currentProject" 
              @change="switchProject"
              class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
            >
              <option v-for="p in projects" :key="p.project_id" :value="p.project_id">
                📁 {{ p.name }}
              </option>
            </select>
            
            <button @click="showNewProject = true" class="btn btn-secondary text-sm">
              ➕ New Project
            </button>
            
            <button 
              @click="showAgentCreator = true"
              class="btn btn-primary"
            >
              ➕ New Agent
            </button>
            
            <div class="flex items-center gap-2">
              <span class="text-sm text-slate-400">{{ user?.username }}</span>
              <button @click="logout" class="text-slate-400 hover:text-white">
                🚪
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-6 py-6">
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <!-- Left: Agent List + Secretary -->
        <div class="lg:col-span-1 space-y-6">
          <AgentList 
            :agents="agents" 
            @select="selectAgent"
            @delete="deleteAgent"
          />
          <SecretaryChat 
            :messages="secretaryMessages"
            @send-message="sendToSecretary"
          />
        </div>

        <!-- Middle: Live Conversation -->
        <div class="lg:col-span-2">
          <LiveConversation :messages="conversationMessages" />
        </div>

        <!-- Right: Config / VNC / Approvals -->
        <div class="lg:col-span-1 space-y-6">
          <ApprovalQueue 
            v-if="approvals.length > 0"
            :approvals="approvals"
            @approve="approveAction"
            @reject="rejectAction"
          />
          
          <AgentConfig 
            v-if="selectedAgent"
            :agent="selectedAgent"
            @upgrade="upgradeAgent"
          />
          
          <BrowserViewer v-else-if="showVnc" />
          
          
          <QuickActions v-else />
        </div>
      </div>
    </main>

    <!-- Modals -->
    <AgentCreator 
      v-if="showAgentCreator"
      :templates="templates"
      :models="models"
      @create="createAgent"
      @close="showAgentCreator = false"
    />
    
    <NewProjectModal
      v-if="showNewProject"
      @create="createProject"
      @close="showNewProject = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import AgentList from './components/AgentList.vue'
import AgentConfig from './components/AgentConfig.vue'
import AgentCreator from './components/AgentCreator.vue'
import SecretaryChat from './components/SecretaryChat.vue'
import LiveConversation from './components/LiveConversation.vue'
import BrowserViewer from './components/BrowserViewer.vue'
import ApprovalQueue from './components/ApprovalQueue.vue'
import QuickActions from './components/QuickActions.vue'
import NewProjectModal from './components/NewProjectModal.vue'

const user = ref(null)
const currentProject = ref('default')
const projects = ref([])
const agents = ref({})
const approvals = ref([])
const selectedAgent = ref(null)
const secretaryMessages = ref([])
const conversationMessages = ref([])
const showVnc = ref(false)
const showAgentCreator = ref(false)
const showNewProject = ref(false)
const templates = ref([])
const models = ref([])

let ws = null

const connectWebSocket = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  ws = new WebSocket(`${protocol}//${window.location.host}/ws`)
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    handleWebSocketMessage(data)
  }
}

const handleWebSocketMessage = (data) => {
  switch (data.type) {
    case 'agent:message':
      agents.value[data.data.name] = data.data
      break
    case 'agent:conversation':
      conversationMessages.value.unshift(data.data)
      break
    case 'secretary_response':
      secretaryMessages.value.push({ role: 'assistant', content: data.data.message })
      break
    case 'supervisor:approval':
      if (data.data.type === 'new_suggestion') {
        approvals.value.push(data.data.suggestion)
      }
      break
  }
}

const fetchProjects = async () => {
  const res = await fetch('/api/projects', { headers: authHeader() })
  if (res.ok) projects.value = await res.json()
}

const createProject = async (data) => {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify(data)
  })
  if (res.ok) {
    await fetchProjects()
    showNewProject.value = false
  }
}

const switchProject = () => {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'switch-project', payload: { projectId: currentProject.value } }))
  }
}

const approveAction = async (id) => {
  await fetch(`/api/approvals/${id}/approve`, { method: 'POST', headers: authHeader() })
  approvals.value = approvals.value.filter(a => a.id !== id)
}

const rejectAction = async (id) => {
  await fetch(`/api/approvals/${id}/reject`, { method: 'POST', headers: authHeader() })
  approvals.value = approvals.value.filter(a => a.id !== id)
}

const authHeader = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
})

const logout = () => {
  localStorage.removeItem('token')
  window.location.href = '/login'
}

onMounted(() => {
  user.value = JSON.parse(localStorage.getItem('user') || '{}')
  connectWebSocket()
  fetchProjects()
})
</script>
