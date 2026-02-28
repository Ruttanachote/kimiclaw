// Timeout and Circuit Breaker
// ป้องกันการรอนานเกินไป และลองใหม่เมื่อ service ล่ม

const axios = require('axios');

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.halfOpenRequests = options.halfOpenRequests || 3;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttempt = Date.now();
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error(`Circuit breaker '${this.name}' is OPEN`);
      }
      this.state = 'HALF_OPEN';
      this.successes = 0;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  onSuccess() {
    this.failures = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.halfOpenRequests) {
        this.state = 'CLOSED';
        console.log(`✅ Circuit breaker '${this.name}' CLOSED`);
      }
    }
  }

  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      console.error(`🚨 Circuit breaker '${this.name}' OPENED until ${new Date(this.nextAttempt)}`);
    }
  }

  getState() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailureTime
    };
  }
}

// Timeout wrapper
const withTimeout = (promise, ms, errorMessage = 'Operation timed out') => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), ms)
    )
  ]);
};

// Retry with exponential backoff
const withRetry = async (fn, options = {}) => {
  const maxRetries = options.maxRetries || 3;
  const baseDelay = options.baseDelay || 1000;
  const maxDelay = options.maxDelay || 10000;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      
      if (attempt === maxRetries) {
        throw err;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      
      console.log(`⏳ Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  
  throw lastError;
};

// AI Request with timeout and retry
const aiRequest = async (provider, requestFn, options = {}) => {
  const timeout = options.timeout || 30000; // 30 seconds
  const maxRetries = options.maxRetries || 2;
  
  return withRetry(async () => {
    return withTimeout(
      requestFn(),
      timeout,
      `AI request to ${provider} timed out after ${timeout}ms`
    );
  }, { maxRetries });
};

// Circuit breakers for each AI provider
const circuitBreakers = {
  anthropic: new CircuitBreaker('anthropic', { failureThreshold: 3 }),
  openai: new CircuitBreaker('openai', { failureThreshold: 3 }),
  google: new CircuitBreaker('google', { failureThreshold: 3 }),
  moonshot: new CircuitBreaker('moonshot', { failureThreshold: 3 }),
  deepseek: new CircuitBreaker('deepseek', { failureThreshold: 3 }),
  openrouter: new CircuitBreaker('openrouter', { failureThreshold: 3 })
};

// Execute with circuit breaker
const withCircuitBreaker = async (provider, fn) => {
  const breaker = circuitBreakers[provider];
  if (!breaker) {
    return fn();
  }
  return breaker.execute(fn);
};

// Get all circuit breaker states
const getCircuitBreakerStates = () => {
  return Object.entries(circuitBreakers).map(([name, breaker]) => ({
    provider: name,
    ...breaker.getState()
  }));
};

module.exports = {
  CircuitBreaker,
  withTimeout,
  withRetry,
  aiRequest,
  withCircuitBreaker,
  getCircuitBreakerStates,
  circuitBreakers
};
