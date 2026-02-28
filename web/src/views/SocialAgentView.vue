<template>
  <div class="min-h-screen bg-slate-950 p-6">
    <!-- Header -->
    <div class="max-w-7xl mx-auto mb-6">
      <div class="flex items-center gap-3">
        <span class="text-4xl">📱</span>
        <div>
          <h1 class="text-2xl font-bold">Social Media Agent</h1>
          <p class="text-slate-400">AI ดูแล Facebook/TikTok โพสต์เนื้อหา ตอบคอมเมนต์ วิเคราะห์ engagement</p>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto">
      <!-- Tabs -->
      <div class="flex gap-2 mb-6">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="btn"
          :class="activeTab === tab.id ? 'btn-primary' : 'btn-secondary'"
        >
          {{ tab.icon }} {{ tab.name }}
        </button>
      </div>

      <!-- Accounts Tab -->
      <div v-if="activeTab === 'accounts'">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Add Account -->
          <div class="card">
            <h2 class="font-semibold mb-4">➕ Add Account</h2>
            
            <div class="space-y-4">
              <!-- Platform Selection -->
              <div class="grid grid-cols-2 gap-4">
                <button
                  v-for="platform in platforms"
                  :key="platform.id"
                  @click="newAccount.platform = platform.id"
                  class="p-4 rounded-lg border-2 text-center transition-all"
                  :class="newAccount.platform === platform.id 
                    ? 'border-blue-500 bg-blue-500/20' 
                    : 'border-slate-700 hover:border-slate-600'"
                >
                  <div class="text-3xl mb-2">{{ platform.icon }}</div>
                  <div class="font-medium">{{ platform.name }}</div>
                </button>
              </div>

              <!-- Login Form -->
              <div v-if="newAccount.platform">
                <input
                  v-model="newAccount.email"
                  type="email"
                  placeholder="Email or username"
                  class="input"
                />
                
                <input
                  v-model="newAccount.password"
                  type="password"
                  placeholder="Password"
                  class="input mt-3"
                />
                
                <input
                  v-model="newAccount.twoFA"
                  placeholder="2FA Code (if enabled)"
                  class="input mt-3"
                />

                <div class="flex items-center gap-2 mt-3">
                  <input 
                    type="checkbox" 
                    v-model="newAccount.showBrowser"
                    id="showBrowser"
                    class="rounded"
                  />
                  <label for="showBrowser" class="text-sm text-slate-400">
                    Show browser (watch AI work)
                  </label>
                </div>

                <button
                  @click="connectAccount"
                  :disabled="connecting || !newAccount.email || !newAccount.password"
                  class="btn btn-primary w-full mt-4"
                >
                  {{ connecting ? '⏳ Connecting...' : '🔗 Connect Account' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Connected Accounts -->
          <div class="card">
            <h2 class="font-semibold mb-4">✅ Connected Accounts</h2>
            
            <div v-if="accounts.length === 0" class="text-center py-8">
              <span class="text-4xl">📱</span>
              <p class="text-slate-500 mt-2">No accounts connected</p>
            </div>
            
            <div v-else class="space-y-3">
              <div
                v-for="account in accounts"
                :key="account.id"
                class="p-4 bg-slate-800 rounded-lg flex items-center justify-between"
              >
                <div class="flex items-center gap-3">
                  <span class="text-2xl">{{ getPlatformIcon(account.platform) }}</span>
                  
                  <div>
                    <div class="font-medium">{{ account.email }}</div>
                    <div class="flex items-center gap-2">
                      <span 
                        class="text-xs px-2 py-0.5 rounded"
                        :class="account.status === 'connected' ? 'bg-green-600' : 'bg-red-600'"
                      >
                        {{ account.status }}
                      </span>
                      
                      <span v-if="account.monitoring" class="text-xs text-blue-400">
                        👁️ Monitoring
                      </span>
                    </div>
                  </div>
                </div>
                
                <div class="flex gap-2">
                  <button
                    @click="toggleMonitoring(account.id)"
                    class="btn btn-secondary text-sm"
                    :class="{ 'bg-blue-600': account.monitoring }"
                  >
                    {{ account.monitoring ? '⏹ Stop' : '▶️ Monitor' }}
                  </button>
                  
                  <button
                    @click="disconnectAccount(account.id)"
                    class="btn btn-secondary text-sm text-red-400"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Post Tab -->
      <div v-if="activeTab === 'create'">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Post Creator -->
          <div class="card">
            <h2 class="font-semibold mb-4">📝 Create Post</h2>
            
            <div class="space-y-4">
              <!-- Select Account -->
              <select v-model="postForm.accountId" class="input"
              >
                <option value="">Select account...</option>
                <option 
                  v-for="account in accounts.filter(a => a.status === 'connected')" 
                  :key="account.id" 
                  :value="account.id"
                >
                  {{ getPlatformIcon(account.platform) }} {{ account.email }}
                </option>
              </select>

              <!-- Topic/Idea -->
              <input
                v-model="postForm.topic"
                placeholder="What's this post about?"
                class="input"
              />

              <!-- AI Generate -->
              <button
                @click="generatePostContent"
                :disabled="!postForm.topic || generatingContent"
                class="btn btn-secondary w-full"
              >
                {{ generatingContent ? '✨ Generating...' : '✨ Generate with AI' }}
              </button>

              <!-- Generated Content -->
              <div v-if="generatedContent">
                <textarea
                  v-model="postForm.content"
                  class="input w-full h-32 resize-none"
                  placeholder="Post content..."
                ></textarea>

                <div class="flex flex-wrap gap-2 mt-2">
                  <span
                    v-for="tag in generatedContent.hashtags"
                    :key="tag"
                    class="text-sm bg-blue-600/30 text-blue-400 px-2 py-1 rounded"
                  >
                    #{{ tag }}
                  </span>
                </div>
              </div>

              <!-- Media Upload -->
              <div
                @click="$refs.mediaInput.click()"
                class="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-all"
              >
                <input
                  ref="mediaInput"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  class="hidden"
                  @change="handleMediaSelect"
                />
                
                <div v-if="postForm.media.length === 0">
                  <div class="text-3xl mb-2">📤</div>
                  <p class="text-slate-400">Add photos or videos</p>
                </div>
                
                <div v-else class="flex gap-2 flex-wrap">
                  <div
                    v-for="(file, i) in postForm.media"
                    :key="i"
                    class="w-20 h-20 bg-slate-800 rounded-lg flex items-center justify-center text-2xl"
                  >
                    {{ file.type.startsWith('video') ? '🎬' : '🖼️' }}
                  </div>
                </div>
              </div>

              <!-- Schedule -->
              <div class="grid grid-cols-2 gap-4">
                <input
                  v-model="postForm.scheduledDate"
                  type="date"
                  class="input"
                />
                
                <input
                  v-model="postForm.scheduledTime"
                  type="time"
                  class="input"
                />
              </div>

              <!-- Post Now or Schedule -->
              <div class="flex gap-3">
                <button
                  @click="postNow"
                  :disabled="!canPost"
                  class="btn btn-primary flex-1"
                >
                  🚀 Post Now
                </button>
                
                <button
                  @click="schedulePost"
                  :disabled="!canPost || !postForm.scheduledDate"
                  class="btn btn-secondary flex-1"
                >
                  📅 Schedule
                </button>
              </div>
            </div>
          </div>

          <!-- Preview -->
          <div class="card">
            <h2 class="font-semibold mb-4">👁️ Preview</h2>
            
            <div class="bg-slate-800 rounded-lg p-4">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 bg-slate-700 rounded-full"></div>
                <div>
                  <div class="font-medium">Your Page</div>
                  <div class="text-xs text-slate-500">Just now · 🌎 Public</div>
                </div>
              </div>
              
              <p class="mb-4">{{ postForm.content || 'Your post content will appear here...' }}</p>
              
              <div v-if="postForm.media.length > 0" class="grid grid-cols-2 gap-2 mb-4">
                <div
                  v-for="(file, i) in postForm.media.slice(0, 4)"
                  :key="i"
                  class="aspect-square bg-slate-700 rounded-lg flex items-center justify-center"
                >
                  {{ file.type.startsWith('video') ? '🎬' : '🖼️' }}
                </div>
              </div>
              
              <div class="flex items-center justify-between text-slate-500 text-sm pt-4 border-t border-slate-700"
003e
                <span>👍 Like</span>
                <span>💬 Comment</span>
                <span>🔄 Share</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Calendar Tab -->
      <div v-if="activeTab === 'calendar'">
        <div class="card">
          <div class="flex items-center justify-between mb-6">
            <h2 class="font-semibold">📅 Content Calendar</h2>
            
            <button @click="generateCalendar" class="btn btn-secondary"
003e
              ✨ Generate with AI
            </button>
          </div>
          
          <div class="grid grid-cols-7 gap-2">
            <div
              v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']"
              :key="day"
              class="text-center text-sm text-slate-500 py-2"
            >
              {{ day }}
            </div>
            
            <div
              v-for="date in calendarDays"
              :key="date.date"
              class="min-h-24 p-2 bg-slate-800 rounded-lg"
              :class="{ 'bg-blue-900/30': date.hasPost }"
            >
              <div class="text-sm text-slate-400 mb-1">{{ date.day }}</div>
              
              <div v-if="date.post" class="text-xs">
                <div class="font-medium truncate">{{ date.post.topic }}</div>
                <div class="text-slate-500">{{ date.post.bestTime }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Analytics Tab -->
      <div v-if="activeTab === 'analytics'">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Stats Cards -->
          <div class="card">
            <div class="text-3xl mb-2">👥</div>
            <div class="text-3xl font-bold">{{ analytics.followers }}</div>
            <div class="text-slate-400">Followers</div>
          </div>
          
          <div class="card">
            <div class="text-3xl mb-2">👀</div>
            <div class="text-3xl font-bold">{{ analytics.views }}</div>
            <div class="text-slate-400">Total Views</div>
          </div>
          
          <div class="card">
            <div class="text-3xl mb-2">❤️</div>
            <div class="text-3xl font-bold">{{ analytics.engagement }}%</div>
            <div class="text-slate-400">Engagement Rate</div>
          </div>

          <!-- Recent Posts Performance -->
          <div class="card md:col-span-3">
            <h3 class="font-semibold mb-4">📊 Recent Posts Performance</h3>
            
            <div class="space-y-3">
              <div
                v-for="post in recentPosts"
                :key="post.id"
                class="p-4 bg-slate-800 rounded-lg flex items-center justify-between"
              >
                <div class="flex-1">
                  <p class="truncate">{{ post.content }}</p>
                  <div class="text-sm text-slate-500">{{ post.date }}</div>
                </div>
                
                <div class="flex gap-4 text-sm">
                  <span>👍 {{ post.likes }}</span>
                  <span>💬 {{ post.comments }}</span>
                  <span>🔄 {{ post.shares }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const tabs = [
  { id: 'accounts', name: 'Accounts', icon: '🔗' },
  { id: 'create', name: 'Create Post', icon: '📝' },
  { id: 'calendar', name: 'Calendar', icon: '📅' },
  { id: 'analytics', name: 'Analytics', icon: '📊' }
]

const activeTab = ref('accounts')

// Platforms
const platforms = [
  { id: 'facebook', name: 'Facebook', icon: '🔵' },
  { id: 'tiktok', name: 'TikTok', icon: '⚫' }
]

// Accounts
const accounts = ref([])
const connecting = ref(false)

const newAccount = ref({
  platform: 'facebook',
  email: '',
  password: '',
  twoFA: '',
  showBrowser: true
})

// Post Creation
const postForm = ref({
  accountId: '',
  topic: '',
  content: '',
  media: [],
  scheduledDate: '',
  scheduledTime: ''
})

const generatingContent = ref(false)
const generatedContent = ref(null)

// Calendar
const calendarDays = ref([])

// Analytics
const analytics = ref({
  followers: '12.5K',
  views: '45.2K',
  engagement: '4.8'
})

const recentPosts = ref([
  { id: 1, content: 'Check out our new product launch! 🚀', date: '2 hours ago', likes: 234, comments: 45, shares: 12 },
  { id: 2, content: 'Behind the scenes of our team...', date: '1 day ago', likes: 567, comments: 89, shares: 34 }
])

const getPlatformIcon = (id: string) => {
  return platforms.find(p => p.id === id)?.icon || '📱'
}

const canPost = computed(() => {
  return postForm.value.accountId && postForm.value.content
})

const connectAccount = async () => {
  connecting.value = true
  
  // Simulate connection
  await new Promise(r => setTimeout(r, 2000))
  
  accounts.value.push({
    id: Date.now(),
    platform: newAccount.value.platform,
    email: newAccount.value.email,
    status: 'connected',
    monitoring: false
  })
  
  connecting.value = false
  newAccount.value.email = ''
  newAccount.value.password = ''
  newAccount.value.twoFA = ''
}

const disconnectAccount = (id: number) => {
  accounts.value = accounts.value.filter(a => a.id !== id)
}

const toggleMonitoring = (id: number) => {
  const account = accounts.value.find(a => a.id === id)
  if (account) {
    account.monitoring = !account.monitoring
  }
}

const generatePostContent = async () => {
  generatingContent.value = true
  
  // Simulate AI generation
  await new Promise(r => setTimeout(r, 1500))
  
  generatedContent.value = {
    text: `🎉 Exciting news! We're launching something amazing soon.

Stay tuned for the big reveal! This is going to change everything. ✨

What do you think it could be? Drop your guesses below! 👇`,
    hashtags: ['launch', 'comingsoon', 'innovation', 'tech'],
    bestTimeToPost: '14:00'
  }
  
  postForm.value.content = generatedContent.value.text
  generatingContent.value = false
}

const handleMediaSelect = (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  if (files) {
    postForm.value.media = Array.from(files)
  }
}

const postNow = async () => {
  // Post immediately
  console.log('Posting now:', postForm.value)
}

const schedulePost = async () => {
  // Schedule post
  console.log('Scheduling:', postForm.value)
}

const generateCalendar = async () => {
  // Generate AI calendar
  const days = []
  for (let i = 0; i < 30; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)
    
    days.push({
      date: date.toISOString(),
      day: date.getDate(),
      hasPost: i % 3 === 0,
      post: i % 3 === 0 ? {
        topic: ['Product Tips', 'Behind Scenes', 'User Story', 'Industry News'][i % 4],
        bestTime: '14:00'
      } : null
    })
  }
  calendarDays.value = days
}
</script>
