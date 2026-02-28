-- Add subscription and billing tables

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    plan_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly INTEGER NOT NULL, -- in cents
    price_yearly INTEGER NOT NULL, -- in cents
    features JSONB DEFAULT '[]',
    limits JSONB DEFAULT '{}', -- { requests_per_day, tokens_per_month, agents_limit }
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) REFERENCES subscription_plans(plan_id),
    status VARCHAR(20) DEFAULT 'active', -- active, cancelled, expired, trial
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT false,
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usage tracking
CREATE TABLE IF NOT EXISTS usage_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    requests_count INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    cost_cents INTEGER DEFAULT 0,
    UNIQUE(user_id, date)
);

-- Billing history
CREATE TABLE IF NOT EXISTS billing_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, refunded
    payment_provider VARCHAR(50),
    payment_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Accounts (for proxy)
CREATE TABLE IF NOT EXISTS ai_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- anthropic, openai
    encrypted_key TEXT NOT NULL,
    daily_limit INTEGER DEFAULT 1000,
    usage_today INTEGER DEFAULT 0,
    usage_total INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_shared BOOLEAN DEFAULT false, -- true = system account, false = user account
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default plans
INSERT INTO subscription_plans (plan_id, name, description, price_monthly, price_yearly, features, limits) VALUES
    ('free', 'Free', 'Perfect for trying out', 0, 0, 
     '["50 requests/day", "Basic agents", "Community support"]', 
     '{"requests_per_day": 50, "tokens_per_month": 10000, "agents_limit": 3}'),
     
    ('starter', 'Starter', 'For individual developers', 900, 9000, 
     '["500 requests/day", "All agents", "Priority support", "Analytics"]', 
     '{"requests_per_day": 500, "tokens_per_month": 100000, "agents_limit": 8}'),
     
    ('pro', 'Pro', 'For professional teams', 2900, 29000, 
     '["Unlimited requests", "All agents", "Priority support", "Analytics", "Custom integrations"]', 
     '{"requests_per_day": -1, "tokens_per_month": 1000000, "agents_limit": -1}'),
     
    ('enterprise', 'Enterprise', 'For large organizations', 0, 0, 
     '["Custom limits", "Dedicated support", "SLA", "On-premise option"]', 
     '{"requests_per_day": -1, "tokens_per_month": -1, "agents_limit": -1}')
ON CONFLICT (plan_id) DO NOTHING;

-- Insert shared AI account (for free users)
INSERT INTO ai_accounts (user_id, provider, encrypted_key, is_shared, daily_limit) VALUES
    (1, 'anthropic', 'ENCRYPTED_SHARED_KEY', true, 10000)
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_tracking(user_id, date);
CREATE INDEX IF NOT EXISTS idx_billing_user ON billing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_accounts_user ON ai_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_accounts_shared ON ai_accounts(is_shared) WHERE is_shared = true;
