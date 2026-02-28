<template>
  <div class="min-h-screen bg-slate-950 p-6">
    <!-- Header -->
    <div class="max-w-7xl mx-auto mb-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-3xl">🧠</span>
          <div>
            <h1 class="text-2xl font-bold">Agent Memory Editor</h1>
            <p class="text-slate-400">View and edit agent memories (.md files)</p>
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <select 
            v-model="selectedAgent" 
            @change="loadMemory"
            class="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
          >
            <option v-for="agent in agents" :key="agent" :value="agent">
              {{ getAgentIcon(agent) }} {{ agent }}
            </option>
          </select>
          
          <button @click="createNewMemory" class="btn btn-primary">
            ➕ New Memory
          </button>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left: Sections -->
      <div class="lg:col-span-1">
        <div class="card">
          <h2 class="font-semibold mb-4">Sections</h2>
          
          <div class="space-y-2">
            <button
              v-for="(items, section) in memory.sections"
              :key="section"
              @click="selectSection(section)"
              class="w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors"
              :class="selectedSection === section ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'"
            >
              <span>{{ section }}</span>
              <span class="bg-slate-900 px-2 py-1 rounded text-xs">
                {{ items.length }}
              </span>
            </button>
          </div>

          <button 
            @click="addSection"
            class="w-full mt-4 p-2 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-white hover:border-slate-400"
          >
            + Add Section
          </button>
        </div>

        <!-- Metadata -->
        <div class="card mt-4">
          <h2 class="font-semibold mb-4">Metadata</h2>
          
          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-slate-400">Agent</span>
              <span>{{ memory.metadata.agent }}</span>
            </div>
            
            <div class="flex justify-between">
              <span class="text-slate-400">Created</span>
              <span>{{ formatDate(memory.metadata.created) }}</span>
            </div>
            
            <div class="flex justify-between">
              <span class="text-slate-400">Updated</span>
              <span>{{ formatDate(memory.metadata.lastUpdated) }}</span>
            </div>
            
            <div class="flex justify-between">
              <span class="text-slate-400">Version</span>
              <span>{{ memory.metadata.version }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Content Editor -->
      <div class="lg:col-span-2">
        <div class="card h-full">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold">{{ selectedSection }}</h2>
            
            <div class="flex items-center gap-2">
              <button @click="searchMode = !searchMode" class="btn btn-secondary text-sm">
                🔍 Search
              </button>
              
              <button @click="saveMemory" :disabled="!hasChanges" class="btn btn-primary text-sm"
003e
                💾 Save
              </button>
            </div>
          </div>

          <!-- Search -->
          <div v-if="searchMode" class="mb-4">
            <input
              v-model="searchQuery"
              @input="performSearch"
              type="text"
              placeholder="Search in memory..."
              class="input"
            />
            
            <div v-if="searchResults.length > 0" class="mt-2 max-h-40 overflow-y-auto bg-slate-800 rounded">
              <div
                v-for="result in searchResults"
                :key="result.id"
                @click="jumpToResult(result)"
                class="p-2 hover:bg-slate-700 cursor-pointer border-b border-slate-700 last:border-0"
              >
                <p class="text-sm font-medium">{{ result.section }}</p>
                <p class="text-xs text-slate-400 truncate">{{ result.content }}</p>
              </div>
            </div>
          </div>

          <!-- Items List -->
          <div class="space-y-3 max-h-[600px] overflow-y-auto">
            <div
              v-for="(item, index) in currentSectionItems"
              :key="item.id"
              class="p-4 bg-slate-800 rounded-lg group"
            >
              <div class="flex items-start gap-3">
                <span class="text-slate-500 text-sm mt-1">{{ index + 1 }}.</span>
                
                <textarea
                  v-model="item.content"
                  @input="markChanged"
                  class="flex-1 bg-transparent border-none resize-none focus:outline-none"
                  rows="2"
                ></textarea>
                
                <button 
                  @click="deleteItem(index)"
                  class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
                >
                  🗑️
                </button>
              </div>
              
              <div class="flex items-center gap-2 mt-2 ml-6">
                <span class="text-xs text-slate-500">{{ formatDate(item.timestamp) }}</span>
                
                <div class="flex items-center gap-1">
                  <span
                    v-for="tag in item.tags"
                    :key="tag"
                    class="text-xs bg-slate-700 px-2 py-0.5 rounded"
                  >
                    {{ tag }}
                  </span>
                  
                  <button @click="addTag(index)" class="text-xs text-slate-500 hover:text-white">
                    +tag
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Add New Item -->
          <div class="mt-4 p-4 bg-slate-800/50 rounded-lg border border-dashed border-slate-600">
            <textarea
              v-model="newItemContent"
              placeholder="Add new memory item..."
              class="input w-full mb-2"
              rows="2"
            ></textarea>
            
            <button 
              @click="addItem"
              :disabled="!newItemContent.trim()"
              class="btn btn-primary w-full"
              :class="{ 'opacity-50': !newItemContent.trim() }"
            >
              ➕ Add Item
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const agents = ref(['research-agent', 'uiux-agent', 'frontend-agent', 'backend-agent', 'qa-agent', 'pmba-agent', 'supervisor-agent', 'secretary-agent'])
const selectedAgent = ref('secretary-agent')
const selectedSection = ref('Learned Patterns')
const searchMode = ref(false)
const searchQuery = ref('')
const searchResults = ref([])
const newItemContent = ref('')
const hasChanges = ref(false)

const memory = ref({
  metadata: {
    agent: 'secretary-agent',
    created: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    version: 1
  },
  sections: {
    'Learned Patterns': [
      { id: '1', content: 'User prefers Vue 3 over React for new projects', timestamp: new Date().toISOString(), tags: ['preference', 'frontend'] },
      { id: '2', content: 'Always add error handling in API calls', timestamp: new Date().toISOString(), tags: ['best-practice'] }
    ],
    'Common Mistakes': [
      { id: '3', content: 'Forgetting to validate user input', timestamp: new Date().toISOString(), tags: ['security'] }
    ],
    'User Preferences': [],
    'Project Context': [],
    'Improvements': []
  }
})

const currentSectionItems = computed(() => {
  return memory.value.sections[selectedSection.value] || []
})

const getAgentIcon = (agent: string) => {
  const icons: Record<string, string> = {
    'research-agent': '🔍',
    'uiux-agent': '🎨',
    'frontend-agent': '⚛️',
    'backend-agent': '🔧',
    'qa-agent': '🧪',
    'pmba-agent': '📊',
    'supervisor-agent': '👁️',
    'secretary-agent': '💬'
  }
  return icons[agent] || '🤖'
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('th-TH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadMemory = async () => {
  // Fetch from API
  try {
    const res = await fetch(`/api/agents/${selectedAgent.value}/memory`)
    if (res.ok) {
      memory.value = await res.json()
    }
  } catch (err) {
    console.error('Failed to load memory:', err)
  }
}

const selectSection = (section: string) => {
  selectedSection.value = section
  searchMode.value = false
}

const addSection = () => {
  const name = prompt('Section name:')
  if (name) {
    memory.value.sections[name] = []
    selectedSection.value = name
    markChanged()
  }
}

const addItem = () => {
  if (!newItemContent.value.trim()) return
  
  memory.value.sections[selectedSection.value].push({
    id: Date.now().toString(),
    content: newItemContent.value,
    timestamp: new Date().toISOString(),
    tags: []
  })
  
  newItemContent.value = ''
  markChanged()
}

const deleteItem = (index: number) => {
  if (confirm('Delete this item?')) {
    memory.value.sections[selectedSection.value].splice(index, 1)
    markChanged()
  }
}

const addTag = (itemIndex: number) => {
  const tag = prompt('Tag name:')
  if (tag) {
    memory.value.sections[selectedSection.value][itemIndex].tags.push(tag)
    markChanged()
  }
}

const markChanged = () => {
  hasChanges.value = true
}

const saveMemory = async () => {
  try {
    const res = await fetch(`/api/agents/${selectedAgent.value}/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memory.value)
    })
    
    if (res.ok) {
      hasChanges.value = false
      alert('Saved!')
    }
  } catch (err) {
    alert('Failed to save')
  }
}

const performSearch = () => {
  if (!searchQuery.value) {
    searchResults.value = []
    return
  }
  
  const results: any[] = []
  
  for (const [section, items] of Object.entries(memory.value.sections)) {
    for (const item of items as any[]) {
      if (item.content.toLowerCase().includes(searchQuery.value.toLowerCase())) {
        results.push({ ...item, section })
      }
    }
  }
  
  searchResults.value = results
}

const jumpToResult = (result: any) => {
  selectedSection.value = result.section
  searchMode.value = false
}

const createNewMemory = () => {
  const agent = prompt('Agent name:')
  if (agent) {
    selectedAgent.value = agent
    memory.value = {
      metadata: {
        agent,
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        version: 1
      },
      sections: {
        'Learned Patterns': [],
        'Common Mistakes': [],
        'User Preferences': [],
        'Project Context': [],
        'Improvements': []
      }
    }
    markChanged()
  }
}

onMounted(() => {
  loadMemory()
})
</script>
