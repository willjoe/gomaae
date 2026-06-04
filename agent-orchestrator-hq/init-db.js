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
ensureColumn('tickets', 'vector_embedding', 'BLOB');
ensureColumn('tickets', 'linked_ticket_id', 'TEXT');
ensureColumn('tickets', 'document_path', 'TEXT');
ensureColumn('tickets', 'project_id', 'TEXT');
ensureColumn('agent_roles', 'project_id', 'TEXT');
ensureColumn('agents', 'project_id', 'TEXT');
ensureColumn('logs', 'project_id', 'TEXT');
ensureColumn('service_accounts', 'project_id', 'TEXT');
ensureColumn('projects', 'repo_path', 'TEXT');
ensureColumn('projects', 'docs_path', 'TEXT');
ensureColumn('projects', 'created_at', 'DATETIME');

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
    execution_flag TEXT,
    authorized_model TEXT,
    llm_role TEXT,
    personality_vector TEXT,
    expected_token_usage INTEGER,
    actual_token_usage INTEGER,
    blocked_by TEXT,
    blocking TEXT,
    resource_scope TEXT,
    mutation_scope TEXT,
    ttl DATETIME,
    document_name TEXT,
    document_type TEXT,
    document_content TEXT,
    document_path TEXT,
    start_date TEXT,
    due_date TEXT,
    vector_embedding BLOB,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    linked_ticket_id TEXT,
    project_id TEXT
  );
  
  CREATE VIRTUAL TABLE IF NOT EXISTS vec_tickets USING vec0(
    ticket_id TEXT PRIMARY KEY,
    embedding FLOAT[256]
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT, 
    value TEXT, 
    project_id TEXT,
    PRIMARY KEY (key, project_id)
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY, 
    name TEXT, 
    description TEXT, 
    repo_path TEXT,
    docs_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    is_active INTEGER DEFAULT 0
  );
  
  CREATE TABLE IF NOT EXISTS agent_roles (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    project_id TEXT,
    UNIQUE(name, project_id)
  );

  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,
    llm_provider TEXT,
    container_id TEXT,
    status TEXT,
    project_id TEXT
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT,
    agent_id TEXT,
    log_line TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    project_id TEXT
  );

  CREATE TABLE IF NOT EXISTS service_accounts (
    id TEXT PRIMARY KEY,
    name TEXT,
    platform TEXT,
    iam_roles TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    project_id TEXT
  );

  CREATE TABLE IF NOT EXISTS available_models (
    id TEXT,
    provider_id TEXT,
    name TEXT,
    type TEXT,
    project_id TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, project_id)
  );
`);

if (process.env.SEED_MOCK_DATA === 'true') {
    console.log("Restoring Massive Hierarchical Waterfall Data with Universal Verification...");

    db.prepare("DELETE FROM tickets").run();
    db.prepare("DELETE FROM agent_roles").run();
    db.prepare("DELETE FROM projects").run();

    // 0. SEED PROJECTS
    db.prepare("INSERT INTO projects (id, name, description, is_active, repo_path, docs_path) VALUES (?, ?, ?, ?, ?, ?)")
      .run('proj-1', 'Agentic Engineering HQ', 'Core platform for AI orchestration.', 1, '/Users/will/Code/high-integrity-atomic-development/agent-orchestrator-hq/repos/agentic-engineering-hq', '/Users/will/Code/high-integrity-atomic-development/agent-orchestrator-hq/docs/agentic-engineering-hq');

    // 0. SEED ROLES
    const roles = [
        { id: 'role-1', name: 'Product Architect', description: 'Define structural pillars and coordinate high-level waterfall progression.' },
        { id: 'role-2', name: 'Backend Engineer', description: 'Implement high-integrity API logic and secure data mutations.' },
        { id: 'role-3', name: 'Frontend Engineer', description: 'Build verified UI components following strict design standards.' },
        { id: 'role-4', name: 'Functional QA Eng', description: 'Execute deterministic verification cycles and SRT simulations.' },
        { id: 'role-5', name: 'Security Engineer', description: 'Enforce VFS security policies and mutation authorization.' }
    ];
    const insertRole = db.prepare('INSERT INTO agent_roles (id, name, description, project_id) VALUES (?, ?, ?, ?)');
    roles.forEach(r => insertRole.run(r.id, r.name, r.description, 'proj-1'));
    
    const today = new Date();
    const formatDate = (date) => date.toISOString().split('T')[0];

    // Helper to add ticket
    const addTkt = (tier, parentId, title, status, startDays, dueDays, extra = {}) => {
        const id = `${tier.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`;
        const prefix = tier === 'Epic' ? 'EPC' : tier === 'Story' ? 'STR' : tier === 'Task' ? 'TKT' : tier === 'QA' ? 'QA' : 'BUG';
        const identifier = `${prefix}-${1000 + Math.floor(Math.random() * 9000)}`;
        
        const start = new Date(today.getTime() + startDays * 24 * 60 * 60 * 1000);
        const due = new Date(today.getTime() + dueDays * 24 * 60 * 60 * 1000);

        db.prepare(`
            INSERT INTO tickets (
                id, identifier, title, description, status, tier, parent_id, project_id, 
                start_date, due_date, document_name, document_type, document_content
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, identifier, title, `High-integrity record for ${title}.`, 
            status, tier, parentId, 'proj-1', 
            formatDate(start), formatDate(due),
            `${tier} Spec: ${identifier}`, 'markdown', `# ${title}\nContext for ${tier} tier.`
        );

        return { id, identifier };
    };

    // 1. EPICS
    const epicConfigs = [
        { title: 'Legacy Core Migration', status: 'Done', start: -120, duration: 60, ageDays: 10 },
        { title: 'Spatial Audio Hub', status: 'In Progress', start: -40, duration: 150, ageDays: 1 },
        { title: 'Neural Compute Mesh', status: 'In Review', start: 20, duration: 120, ageDays: 0.5 },
        { title: 'Global Auth v2', status: 'Todo', start: 180, duration: 90 },
        { title: 'Quantum Ledger', status: 'Todo', start: 280, duration: 120 }
    ];

    epicConfigs.forEach((ec) => {
        const epic = addTkt('Epic', null, ec.title, ec.status, ec.start, ec.start + ec.duration);
        
        let lastSIdent = null;
        const storyDuration = Math.floor(ec.duration / 4);
        for (let i = 0; i < 4; i++) {
            const sStart = ec.start + (i * storyDuration) + 2;
            const sDue = sStart + storyDuration - 5;
            let sStatus = ec.status === 'Done' ? 'Done' : (ec.status === 'Todo' ? 'Todo' : (i < 2 ? 'Done' : 'In Progress'));
            if (ec.status === 'In Review' && i === 2) sStatus = 'In Review';

            const story = addTkt('Story', epic.id, `${ec.title} Ph ${i+1}`, sStatus, sStart, sDue);
            
            // Link QA
            const qaStatus = sStatus === 'Done' ? 'Done' : (sStatus === 'In Progress' ? 'Todo' : 'Backlog');
            const qa = {
                id: `qa-story-${Math.random().toString(36).substr(2, 9)}`,
                identifier: `QA-${story.identifier.split('-')[1] || i}`,
                title: `Verify: ${ec.title} Ph ${i+1}`,
                description: `Verification gate for ${story.identifier}.`,
                status: qaStatus,
                tier: 'QA',
                start_date: formatDate(new Date(today.getTime() + (sDue + 1) * 24 * 60 * 60 * 1000)),
                due_date: formatDate(new Date(today.getTime() + (sDue + 5) * 24 * 60 * 60 * 1000)),
                project_id: 'proj-1',
                linked_ticket_id: story.id
            };
            db.prepare('INSERT INTO tickets (id, identifier, title, description, status, tier, start_date, due_date, project_id, linked_ticket_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
                qa.id, qa.identifier, qa.title, qa.description, qa.status, qa.tier, qa.start_date, qa.due_date, qa.project_id, qa.linked_ticket_id
            );

            lastSIdent = story.identifier;

            let lastTIdent = null;
            const taskDuration = Math.floor(storyDuration / 4);
            for (let j = 0; j < 4; j++) {
                const tStart = sStart + (j * taskDuration) + 1;
                const tDue = tStart + taskDuration - 2;
                let tStatus = sStatus === 'Done' ? 'Done' : (sStatus === 'Todo' ? 'Todo' : (j < 2 ? 'Done' : 'In Progress'));
                if (sStatus === 'In Review' && j === 2) tStatus = 'In Review';
                if (sStatus === 'In Progress' && j === 3) tStatus = 'In Review';

                const task = addTkt('Task', story.id, `${ec.title} Ph ${i+1} Dev ${j+1}`, tStatus, tStart, tDue);
                
                // Link QA
                const tQaStatus = tStatus === 'Done' ? 'Done' : (tStatus === 'In Review' ? 'Todo' : 'Backlog');
                const tQa = {
                    id: `qa-task-${Math.random().toString(36).substr(2, 9)}`,
                    identifier: `QA-${task.identifier.split('-')[1] || j}`,
                    title: `Verify: Dev ${j+1}`,
                    description: `Verification gate for ${task.identifier}.`,
                    status: tQaStatus,
                    tier: 'QA',
                    start_date: formatDate(new Date(today.getTime() + (tDue + 1) * 24 * 60 * 60 * 1000)),
                    due_date: formatDate(new Date(today.getTime() + (tDue + 2) * 24 * 60 * 60 * 1000)),
                    project_id: 'proj-1',
                    linked_ticket_id: task.id
                };
                db.prepare('INSERT INTO tickets (id, identifier, title, description, status, tier, start_date, due_date, project_id, linked_ticket_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
                    tQa.id, tQa.identifier, tQa.title, tQa.description, tQa.status, tQa.tier, tQa.start_date, tQa.due_date, tQa.project_id, tQa.linked_ticket_id
                );

                lastTIdent = task.identifier;
            }
        }
    });

    console.log("Seeding Complete.");
}

db.close();
