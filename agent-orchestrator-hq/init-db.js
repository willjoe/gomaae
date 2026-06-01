const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'ticket-manager.db');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Atomic Migration Helper
const ensureColumn = (table, column, definition) => {
    const info = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!info.some(col => col.name === column)) {
        console.log(`Migration: Adding ${column} to ${table}...`);
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
};

// Ensure all high-integrity columns exist
ensureColumn('tickets', 'execution_flag', 'TEXT');
ensureColumn('tickets', 'authorized_model', 'TEXT');
ensureColumn('tickets', 'llm_role', 'TEXT');
ensureColumn('tickets', 'personality_vector', 'TEXT');
ensureColumn('tickets', 'expected_token_usage', 'INTEGER');
ensureColumn('tickets', 'actual_token_usage', 'INTEGER');
ensureColumn('tickets', 'blocked_by', 'TEXT');
ensureColumn('tickets', 'blocking', 'TEXT');
ensureColumn('tickets', 'resource_scope', 'TEXT');
ensureColumn('tickets', 'mutation_scope', 'TEXT');
ensureColumn('tickets', 'ttl', 'DATETIME');
ensureColumn('tickets', 'document_name', 'TEXT');
ensureColumn('tickets', 'document_type', 'TEXT');
ensureColumn('tickets', 'document_content', 'TEXT');
ensureColumn('tickets', 'start_date', 'TEXT');
ensureColumn('tickets', 'due_date', 'TEXT');
ensureColumn('projects', 'created_at', 'DATETIME');

// Initialize remaining schema
db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    identifier TEXT,
    title TEXT,
    description TEXT,
    status TEXT,
    tier TEXT,
    parent_id TEXT,
    assigned_agent_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,
    llm_provider TEXT,
    container_id TEXT,
    status TEXT
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT,
    agent_id TEXT,
    log_line TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS service_accounts (
    id TEXT PRIMARY KEY,
    name TEXT,
    platform TEXT,
    iam_roles TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log("High-Integrity Framework Schema synchronized.");

// Conditional seeding
if (process.env.SEED_MOCK_DATA === 'true') {
    console.log("Seeding framework-aligned mock data...");

    const projExists = db.prepare('SELECT id FROM projects WHERE id = ?').get('proj-1');
    if (!projExists) {
        db.prepare(`INSERT INTO projects (id, name, description, is_active) VALUES (?, ?, ?, ?)`).run(
            'proj-1', 'Agentic Engineering HQ', 'Core platform for AI orchestration.', 1
        );
    }

    db.prepare("DELETE FROM tickets").run();
    
    const today = new Date();
    const formatDate = (date) => date.toISOString().split('T')[0];
    const futureDate = (days) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString();
    };

    const tickets = [
        {
            id: 'init-1', 
            identifier: 'EPC-300', 
            title: 'AR Spectator Mode', 
            description: 'Implement augmented reality overlay.', 
            status: 'Todo', 
            tier: 'Epic', 
            start_date: formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 15)),
            due_date: formatDate(new Date(today.getFullYear(), today.getMonth() + 4, 1)),
            document_name: 'Strategic Blueprint v3.0', 
            document_type: 'markdown', 
            document_content: '# AR Spectator Strategy\n\n## Vision\nTransform how fans view live sports.'
        },
        {
            id: 'plan-1', 
            identifier: 'STR-250', 
            title: 'AI Commentary Engine', 
            description: 'Functional requirements for audio AI.', 
            status: 'Todo', 
            tier: 'Story', 
            parent_id: 'init-1',
            start_date: formatDate(today),
            due_date: formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 15)),
            document_name: 'PRD: Commentary Engine', 
            document_type: 'markdown', 
            document_content: '# PRD: AI Commentary'
        },
        {
            id: 'dev-2', 
            identifier: 'TKT-1050', 
            title: 'OAuth Implementation', 
            description: 'Secure agent-driven auth.', 
            status: 'In Progress', 
            tier: 'Task', 
            parent_id: 'plan-1', 
            assigned_agent_id: 'Claude-dev-1',
            execution_flag: 'Autonomous',
            authorized_model: 'claude-3-5-sonnet',
            llm_role: 'Security Engineer',
            personality_vector: 'security-expert.json',
            expected_token_usage: 50000,
            actual_token_usage: 12450,
            blocked_by: 'EPC-400',
            blocking: 'STR-250',
            resource_scope: 'src/services/auth.ts, src/api/auth/*',
            mutation_scope: 'src/services/auth.ts',
            ttl: futureDate(7),
            start_date: formatDate(today),
            due_date: formatDate(new Date(today.getFullYear(), today.getMonth(), 25)),
            document_name: 'TDR: Auth Implementation', 
            document_type: 'markdown', 
            document_content: '# TDR: Auth Implementation'
        }
    ];

    const insert = db.prepare(`
        INSERT INTO tickets (
            id, identifier, title, description, status, tier, parent_id, assigned_agent_id,
            execution_flag, authorized_model, llm_role, personality_vector, 
            expected_token_usage, actual_token_usage, resource_scope, mutation_scope, ttl,
            document_name, document_type, document_content, start_date, due_date
        ) VALUES (
            @id, @identifier, @title, @description, @status, @tier, @parent_id, @assigned_agent_id,
            @execution_flag, @authorized_model, @llm_role, @personality_vector, 
            @expected_token_usage, @actual_token_usage, @resource_scope, @mutation_scope, @ttl,
            @document_name, @document_type, @document_content, @start_date, @due_date
        )
    `);

    for (const t of tickets) {
        const data = {
            id: null, identifier: null, title: null, description: null, status: null, tier: null, parent_id: null, assigned_agent_id: null,
            execution_flag: null, authorized_model: null, llm_role: null, personality_vector: null, 
            expected_token_usage: null, actual_token_usage: null, resource_scope: null, mutation_scope: null, ttl: null,
            document_name: null, document_type: null, document_content: null, start_date: null, due_date: null,
            ...t
        };
        insert.run(data);
    }
    
    console.log("Mock data seeding complete.");
}

db.close();
