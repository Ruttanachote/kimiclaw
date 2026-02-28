<template>
  <div class="min-h-screen bg-slate-950 flex items-center justify-center">
    <div class="card w-full max-w-md">
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
          <span class="text-3xl">🤖</span>
        </div>
        <h1 class="text-2xl font-bold">AI DevStudio</h1>
        <p class="text-slate-400 mt-2">เข้าสู่ระบบเพื่อเริ่มต้น</p>
      </div>

      <form @submit.prevent="login" class="space-y-4">
        <div v-if="error" class="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
          {{ error }}
        </div>

        <div>
          <label class="block text-sm text-slate-400 mb-1">Username</label>
          <input 
            v-model="username" 
            type="text" 
            class="input"
            placeholder="admin"
            required
          />
        </div>

        <div>
          <label class="block text-sm text-slate-400 mb-1">Password</label>
          <input 
            v-model="password" 
            type="password" 
            class="input"
            placeholder="••••••"
            required
          />
        </div>

        <button 
          type="submit"
          :disabled="loading"
          class="btn btn-primary w-full"
          :class="{ 'opacity-50 cursor-not-allowed': loading }"
        >
          <span v-if="loading">⏳ กำลังเข้าสู่ระบบ...</span>
          <span v-else>เข้าสู่ระบบ</span>
        </button>
      </form>

      <div class="mt-6 text-center">
        <p class="text-sm text-slate-500">
          Default: admin / admin123
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const login = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        password: password.value
      })
    })
    
    const data = await res.json()
    
    if (!res.ok) {
      throw new Error(data.error || 'Login failed')
    }
    
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    
    router.push('/')
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>
