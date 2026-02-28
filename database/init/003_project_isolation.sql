-- Database schema for Project Isolation
-- แยกข้อมูลแต่ละโปรเจกไม่ให้ปนกัน

-- Projects table (existing, but enhanced)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Project-specific memories for each agent
CREATE TABLE IF NOT EXISTS project_memories (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(100) NOT NULL,
    agent_name VARCHAR(50) NOT NULL,
    memory_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, agent_name)
);

-- Project conversations (isolated per project)
CREATE TABLE IF NOT EXISTS project_conversations (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(100) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    message TEXT NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    agent_name VARCHAR(50), -- which agent responded
    context JSONB DEFAULT '{}', -- project context at time of message
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project archives (when switching away)
CREATE TABLE IF NOT EXISTS project_archives (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(100) NOT NULL,
    final_state JSONB NOT NULL,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project tasks (isolated per project)
CREATE TABLE IF NOT EXISTS project_tasks (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(100) UNIQUE NOT NULL,
    project_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to VARCHAR(50), -- agent name
    status VARCHAR(20) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    dependencies JSONB DEFAULT '[]',
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project files/outputs (isolated)
CREATE TABLE IF NOT EXISTS project_files (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50),
    created_by VARCHAR(50), -- agent name
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User active project tracking
CREATE TABLE IF NOT EXISTS user_active_projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE,
    project_id VARCHAR(100) NOT NULL,
    switched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_memories_project ON project_memories(project_id);
CREATE INDEX IF NOT EXISTS idx_project_conversations_project ON project_conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);

-- Function to clean old project data when switching
CREATE OR REPLACE FUNCTION archive_project_data(old_project_id VARCHAR)
RETURNS VOID AS $$
BEGIN
    -- Archive conversations older than 30 days
    INSERT INTO project_archives (project_id, final_state, archived_at)
    SELECT 
        old_project_id,
        jsonb_build_object(
            'conversations', (SELECT jsonb_agg(c) FROM project_conversations c WHERE c.project_id = old_project_id),
            'tasks', (SELECT jsonb_agg(t) FROM project_tasks t WHERE t.project_id = old_project_id),
            'files', (SELECT jsonb_agg(f) FROM project_files f WHERE f.project_id = old_project_id)
        ),
        NOW();
    
    -- Note: We keep project_memories for reference, but mark as archived
END;
$$ LANGUAGE plpgsql;
