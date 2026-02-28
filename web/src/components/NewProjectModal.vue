<template>
  <div v-if="visible" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="card w-full max-w-md">
      <h2 class="text-xl font-bold mb-4">➕ New Project</h2>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-slate-400 mb-1">Project Name</label>
          <input v-model="name" type="text" class="input" placeholder="My Awesome Project" />
        </div>
        
        <div>
          <label class="block text-sm text-slate-400 mb-1">Description</label>
          <textarea v-model="description" class="input" rows="3" placeholder="What is this project about?"></textarea>
        </div>
      </div>
      
      <div class="flex gap-3 mt-6">
        <button @click="$emit('close')" class="btn btn-secondary flex-1">Cancel</button>
        <button 
          @click="create" 
          :disabled="!name"
          class="btn btn-primary flex-1"
          :class="{ 'opacity-50': !name }"
        >
          Create Project
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits(['create', 'close'])

const name = ref('')
const description = ref('')

const create = () => {
  emit('create', { name: name.value, description: description.value })
  name.value = ''
  description.value = ''
}
</script>
