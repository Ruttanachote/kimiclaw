<template>
  <div class="min-h-screen bg-slate-950 p-6">
    <!-- Header -->
    <div class="max-w-6xl mx-auto mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">💳 Choose Your Plan</h1>
          <p class="text-slate-400 mt-2">Start free, upgrade when you need more</p>
        </div>
        
        <!-- Billing toggle -->
        <div class="flex items-center gap-3 bg-slate-800 rounded-lg p-1">
          <button 
            @click="billingCycle = 'monthly'"
            class="px-4 py-2 rounded-md transition-all"
            :class="billingCycle === 'monthly' ? 'bg-blue-600' : ''"
          >
            Monthly
          </button>
          
          <button 
            @click="billingCycle = 'yearly'"
            class="px-4 py-2 rounded-md transition-all flex items-center gap-2"
            :class="billingCycle === 'yearly' ? 'bg-blue-600' : ''"
          >
            Yearly
            <span class="text-xs bg-green-500 text-white px-2 py-0.5 rounded">Save 20%</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Plans -->
    <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div
        v-for="plan in plans"
        :key="plan.plan_id"
        class="card relative"
        :class="{ 'border-2 border-blue-500': plan.popular }"
      >
        <!-- Popular badge -->
        <div 
          v-if="plan.popular"
          class="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-3 py-1 rounded-full"
        >
          Most Popular
        </div>

        <div class="text-center mb-6">
          <h3 class="text-xl font-bold">{{ plan.name }}</h3>
          <p class="text-slate-400 text-sm mt-1">{{ plan.description }}</p>
        </div>

        <!-- Price -->
        <div class="text-center mb-6">
          <div class="flex items-baseline justify-center gap-1">
            <span class="text-4xl font-bold">${{ getPrice(plan) }}</span>
            <span class="text-slate-400">/{{ billingCycle === 'monthly' ? 'mo' : 'yr' }}</span>
          </div>
          
          <p v-if="plan.plan_id === 'free'" class="text-green-400 text-sm">Free forever</p>
        </div>

        <!-- Features -->
        <ul class="space-y-3 mb-6">
          <li
            v-for="feature in plan.features"
            :key="feature"
            class="flex items-center gap-2 text-sm"
          >
            <span class="text-green-500">✓</span>
            <span>{{ feature }}</span>
          </li>
        </ul>

        <!-- CTA -->
        <button
          @click="selectPlan(plan)"
          class="w-full btn"
          :class="plan.plan_id === currentPlan ? 'btn-secondary' : 'btn-primary'"
          :disabled="plan.plan_id === currentPlan"
        >
          <span v-if="plan.plan_id === currentPlan">Current Plan</span>
          <span v-else-if="plan.plan_id === 'free'">Get Started Free</span>
          <span v-else>Upgrade</span>
        </button>
      </div>
    </div>

    <!-- Current usage -->
    <div v-if="currentUser" class="max-w-6xl mx-auto mt-12">
      <div class="card">
        <h2 class="text-lg font-semibold mb-4">Your Usage</h2>
        
        <div class="grid grid-cols-3 gap-6">
          <div>
            <p class="text-slate-400 text-sm">Requests Today</p>
            <p class="text-2xl font-bold">{{ usage.today }} / {{ usage.limit }}</p>
            <div class="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                class="h-full bg-blue-500"
                :style="{ width: `${(usage.today / usage.limit) * 100}%` }"
              ></div>
            </div>
          </div>

          <div>
            <p class="text-slate-400 text-sm">Tokens This Month</p>
            <p class="text-2xl font-bold">{{ formatNumber(usage.tokens) }}</p>
          </div>

          <div>
            <p class="text-slate-400 text-sm">Active Agents</p>
            <p class="text-2xl font-bold">{{ usage.agents }} / {{ usage.agentsLimit }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- FAQ -->
    <div class="max-w-6xl mx-auto mt-12">
      <h2 class="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="faq in faqs" :key="faq.q" class="card">
          <p class="font-medium mb-2">{{ faq.q }}</p>
          <p class="text-sm text-slate-400">{{ faq.a }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const billingCycle = ref('monthly')
const currentPlan = ref('free')
const currentUser = ref(true)

const usage = ref({
  today: 23,
  limit: 50,
  tokens: 15420,
  agents: 3,
  agentsLimit: 3
})

const plans = ref([
  {
    plan_id: 'free',
    name: 'Free',
    description: 'Perfect for trying out',
    price_monthly: 0,
    price_yearly: 0,
    features: ['50 requests/day', '3 agents', 'Basic support', 'Community access'],
    popular: false
  },
  {
    plan_id: 'starter',
    name: 'Starter',
    description: 'For individual developers',
    price_monthly: 9,
    price_yearly: 90,
    features: ['500 requests/day', '8 agents', 'Priority support', 'Analytics dashboard'],
    popular: true
  },
  {
    plan_id: 'pro',
    name: 'Pro',
    description: 'For professional teams',
    price_monthly: 29,
    price_yearly: 290,
    features: ['Unlimited requests', 'Unlimited agents', '24/7 support', 'Custom integrations'],
    popular: false
  },
  {
    plan_id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    price_monthly: 0,
    price_yearly: 0,
    features: ['Custom limits', 'Dedicated support', 'SLA guarantee', 'On-premise option'],
    popular: false
  }
])

const faqs = ref([
  { q: 'What happens when I hit my limit?', a: 'Your requests will be queued until the next day, or you can upgrade to get more.' },
  { q: 'Can I use my own API keys?', a: 'Yes! Pro and Enterprise plans allow you to add your own API keys for unlimited usage.' },
  { q: 'Is there a free trial?', a: 'The Free plan is free forever. No credit card required.' },
  { q: 'Can I cancel anytime?', a: 'Yes, you can cancel or downgrade at any time. No questions asked.' }
])

const getPrice = (plan: any) => {
  if (plan.plan_id === 'enterprise') return 'Custom'
  return billingCycle.value === 'monthly' ? plan.price_monthly : plan.price_yearly
}

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

const selectPlan = (plan: any) => {
  if (plan.plan_id === 'free') {
    window.location.href = '/signup?plan=free'
  } else if (plan.plan_id === 'enterprise') {
    window.location.href = '/contact-sales'
  } else {
    window.location.href = `/checkout?plan=${plan.plan_id}&billing=${billingCycle.value}`
  }
}
</script>
