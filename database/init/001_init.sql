-- Phase 4 Complete: Full database schema with Auth and Projects

-- Users table (Auth)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    owner VARCHAR(100),
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'offline',
    model_provider VARCHAR(50),
    model_name VARCHAR(100),
    config JSONB DEFAULT '{}',
    capabilities JSONB DEFAULT '[]',
    resources JSONB DEFAULT '{}',
    project_id VARCHAR(100),
    container_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to VARCHAR(100),
    project_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    parent_task_id VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'medium',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    conversation_id VARCHAR(100) NOT NULL,
    from_agent VARCHAR(100) NOT NULL,
    to_agent VARCHAR(100),
    message_type VARCHAR(50) DEFAULT 'message',
    content TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    project_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User chats
CREATE TABLE IF NOT EXISTS user_chats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    message TEXT NOT NULL,
    response TEXT,
    context JSONB DEFAULT '{}',
    project_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Approval queue (Supervisor)
CREATE TABLE IF NOT EXISTS approval_queue (
    id SERIAL PRIMARY KEY,
    suggestion_id VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    agent_name VARCHAR(100),
    reason TEXT,
    action JSONB NOT NULL,
    cost_estimate TEXT,
    benefit_estimate TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    rejected_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent metrics
CREATE TABLE IF NOT EXISTS agent_metrics (
    id SERIAL PRIMARY KEY,
    agent_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    value NUMERIC,
    unit VARCHAR(20),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Outputs/Files
CREATE TABLE IF NOT EXISTS outputs (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50),
    project_id VARCHAR(100),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- N8N workflows tracking
CREATE TABLE IF NOT EXISTS n8n_workflows (
    id SERIAL PRIMARY KEY,
    workflow_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255),
    agent_type VARCHAR(50),
    webhook_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_approval_status ON approval_queue(status);
CREATE INDEX IF NOT EXISTS idx_metrics_agent ON agent_metrics(agent_name);
CREATE INDEX IF NOT EXISTS idx_outputs_project ON outputs(project_id);
CREATE INDEX IF NOT EXISTS idx_user_chats_user ON user_chats(user_id);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password_hash, email, role) VALUES
    ('admin', '$2a$10$YourHashedPasswordHere', 'admin@devstudio.local', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Insert default project
INSERT INTO projects (project_id, name, description, status) VALUES
    ('default', 'Default Project', 'Default workspace', 'active')
ON CONFLICT (project_id) DO NOTHING;

-- Insert N8N workflow configs
INSERT INTO n8n_workflows (workflow_id, name, agent_type, webhook_url) VALUES
    ('research-flow', 'Research Workflow', 'research', 'http://n8n:5678/webhook/research'),
    ('uiux-flow', 'UI/UX Workflow', 'uiux', 'http://n8n:5678/webhook/uiux'),
    ('frontend-flow', 'Frontend Workflow', 'frontend', 'http://n8n:5678/webhook/frontend'),
    ('backend-flow', 'Backend Workflow', 'backend', 'http://n8n:5678/webhook/backend'),
    ('qa-flow', 'QA Workflow', 'qa', 'http://n8n:5678/webhook/qa'),
    ('pmba-flow', 'PM/BA Workflow', 'pmba', 'http://n8n:5678/webhook/pmba'),
    ('supervisor-flow', 'Supervisor Workflow', 'supervisor', 'http://n8n:5678/webhook/supervisor'),
    ('secretary-flow', 'Secretary Workflow', 'secretary', 'http://n8n:5678/webhook/secretary')
ON CONFLICT (workflow_id) DO NOTHING;
