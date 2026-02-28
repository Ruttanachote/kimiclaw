// Advanced AI Routing Engine
// เลือก AI provider ตาม task type, cost, speed, context

const providers = require('../config/providers.json');

class AIRoutingEngine {
  constructor() {
    this.providers = providers.providers;
    this.routingRules = this.loadRules();
  }

  loadRules() {
    return {
      // Task type → preferred providers
      taskRouting: {
        'code-generation': ['anthropic', 'deepseek', 'openai'],
        'code-review': ['anthropic', 'openai'],
        'chat': ['anthropic', 'gemini', 'openai'],
        'research': ['gemini', 'anthropic', 'openrouter'],
        'design': ['anthropic', 'gemini'],
        'documentation': ['gemini', 'anthropic', 'deepseek'],
        'translation': ['gemini', 'moonshot', 'deepseek'],
        'math': ['anthropic', 'deepseek'],
        'creative': ['anthropic', 'gemini', 'openai']
      },
      
      // Context length → suitable models
      contextRouting: {
        short: { max: 4000, models: ['claude-3-haiku', 'gemini-1.5-flash', 'gpt-4o-mini'] },
        medium: { max: 32000, models: ['claude-3-5-sonnet', 'gemini-pro', 'gpt-4o'] },
        long: { max: 128000, models: ['claude-3-5-sonnet', 'gemini-1.5-pro'] },
        veryLong: { max: 2000000, models: ['gemini-1.5-pro'] }
      },
      
      // Cost priority
      costTiers: {
        ultraLow: ['deepseek', 'gemini-1.5-flash', 'gpt-4o-mini'],
        low: ['claude-3-haiku', 'gemini-pro', 'deepseek'],
        medium: ['claude-3-5-sonnet', 'gpt-4o', 'gemini-1.5-pro'],
        high: ['claude-3-opus', 'gpt-4-turbo']
      }
    };
  }

  // Main routing function
  async selectProvider(request, userConfig = {}) {
    const {
      taskType = 'chat',
      estimatedTokens = 1000,
      contextLength = 0,
      priority = 'balanced', // 'speed', 'cost', 'quality'
      preferredProviders = [],
      excludeProviders = []
    } = request;

    // Get all available providers for user
    const availableProviders = await this.getAvailableProviders(userConfig.userId);
    
    if (availableProviders.length === 0) {
      throw new Error('No AI providers available');
    }

    // Score each provider
    const scored = availableProviders.map(provider => {
      let score = 0;
      const reasons = [];

      // 1. Task type match
      const taskMatch = this.routingRules.taskRouting[taskType] || [];
      const taskRank = taskMatch.indexOf(provider.id);
      if (taskRank !== -1) {
        score += (10 - taskRank) * 10;
        reasons.push(`Task match #${taskRank + 1}`);
      }

      // 2. Context length suitability
      const contextTier = this.getContextTier(contextLength);
      const suitableModels = this.routingRules.contextRouting[contextTier]?.models || [];
      const hasSuitableModel = provider.models.some(m => suitableModels.includes(m.id));
      if (hasSuitableModel) {
        score += 20;
        reasons.push('Context suitable');
      }

      // 3. Cost efficiency
      const avgPrice = this.getAveragePrice(provider);
      const costScore = this.calculateCostScore(avgPrice, priority);
      score += costScore;
      reasons.push(`Cost: $${avgPrice.toFixed(2)}/1M`);

      // 4. Current load/availability
      const availability = provider.availability || 1;
      score += availability * 15;
      reasons.push(`Availability: ${(availability * 100).toFixed(0)}%`);

      // 5. User preference
      if (preferredProviders.includes(provider.id)) {
        score += 25;
        reasons.push('User preferred');
      }

      // 6. Penalty for excluded
      if (excludeProviders.includes(provider.id)) {
        score -= 100;
        reasons.push('Excluded');
      }

      // 7. Rate limit check
      if (provider.rateLimited) {
        score -= 50;
        reasons.push('Rate limited');
      }

      return {
        provider,
        score,
        reasons,
        recommendedModel: this.selectBestModel(provider, contextLength, priority)
      };
    });

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    // Return top 3 with fallback chain
    return {
      primary: scored[0],
      fallbacks: scored.slice(1, 3),
      all: scored
    };
  }

  getContextTier(length) {
    if (length <= 4000) return 'short';
    if (length <= 32000) return 'medium';
    if (length <= 128000) return 'long';
    return 'veryLong';
  }

  getAveragePrice(provider) {
    const prices = provider.models.map(m => m.pricing.input + m.pricing.output);
    return prices.reduce((a, b) => a + b, 0) / prices.length;
  }

  calculateCostScore(avgPrice, priority) {
    if (priority === 'cost') {
      // Lower price = higher score
      if (avgPrice < 1) return 30;
      if (avgPrice < 5) return 20;
      if (avgPrice < 10) return 10;
      return 0;
    }
    if (priority === 'quality') {
      // Higher price often = better quality
      if (avgPrice > 10) return 30;
      if (avgPrice > 5) return 20;
      return 10;
    }
    // balanced
    return 15;
  }

  selectBestModel(provider, contextLength, priority) {
    const suitable = provider.models.filter(m => m.context >= contextLength);
    
    if (suitable.length === 0) {
      return provider.models[provider.models.length - 1]; // largest context
    }

    if (priority === 'cost') {
      return suitable.sort((a, b) => 
        (a.pricing.input + a.pricing.output) - (b.pricing.input + b.pricing.output)
      )[0];
    }

    if (priority === 'quality') {
      // Assume more expensive = better quality
      return suitable.sort((a, b) => 
        (b.pricing.input + b.pricing.output) - (a.pricing.input + a.pricing.output)
      )[0];
    }

    // balanced - middle option
    return suitable[Math.floor(suitable.length / 2)];
  }

  async getAvailableProviders(userId) {
    // This would query database for user's connected providers
    // For now, return all configured providers
    return this.providers.map(p => ({
      ...p,
      availability: 1,
      rateLimited: false
    }));
  }

  // Auto-route with fallback
  async routeWithFallback(request, userConfig) {
    const selection = await this.selectProvider(request, userConfig);
    
    const chain = [selection.primary, ...selection.fallbacks];
    
    for (const option of chain) {
      try {
        const result = await this.executeRequest(option, request);
        return {
          success: true,
          provider: option.provider.id,
          model: option.recommendedModel.id,
          result,
          usedFallback: option !== selection.primary
        };
      } catch (err) {
        console.log(`Provider ${option.provider.id} failed:`, err.message);
        continue;
      }
    }

    throw new Error('All providers failed');
  }

  async executeRequest(option, request) {
    // This would call the actual AI provider
    // Implementation depends on provider type
    const { provider, recommendedModel } = option;
    
    // Call AI Proxy
    const proxyUrl = process.env.AI_PROXY_URL || 'http://ai-proxy:3001';
    
    const response = await require('axios').post(`${proxyUrl}/proxy/${provider.id}`, {
      model: recommendedModel.id,
      messages: request.messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens
    });

    return response.data;
  }
}

module.exports = AIRoutingEngine;
