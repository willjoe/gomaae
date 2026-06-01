const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'data', 'ticket-manager.db');

if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
}

const db = new Database(DB_PATH);

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
    document_name TEXT,
    document_type TEXT,
    document_content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,
    llm_provider TEXT,
    status TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
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

console.log("Schema initialized for Document Preview scenario.");

const initialProjects = [
    ['proj-1', 'Agentic Engineering HQ', 'Core platform for AI orchestration.', 1]
];
const insertProject = db.prepare(`INSERT INTO projects (id, name, description, is_active) VALUES (?, ?, ?, ?)`);
for (const p of initialProjects) insertProject.run(...p);

const now = new Date().toISOString();

const tickets = [
    // INITIATIVE (CONCEPTUAL)
    ['init-1', 'EPC-300', 'AR Spectator Mode', 'Implement augmented reality overlay.', 'Todo', 'Epic', null, null, 
     'Strategic Blueprint v3.0', 'markdown', '# AR Spectator Strategy\n\n## Vision\nTransform how fans view live sports through persistent spatial overlays.\n\n## Conceptual Ideas\n- Real-time player speed tracking above their heads.\n- Interactive heatmap of ball position.\n- Virtual "Ghost" replays on the actual field.'],
    
    // PLANNING (FUNCTIONAL/PRD)
    ['plan-1', 'STR-250', 'AI Commentary Engine', 'Functional requirements for audio AI.', 'Todo', 'Story', 'init-1', 'Claude-dev-1',
     'PRD: Commentary Engine', 'markdown', '# Product Requirement Document: AI Commentary\n\n## Functional Scope\nThe system must generate multi-language audio commentary with < 200ms latency.\n\n### User Flows\n1. User selects language.\n2. AI analyzes real-time sensor stream.\n3. Commentary synthesized via ElevenLabs API.'],
    
    // DEVELOPMENT (TECHNICAL/TDR)
    ['dev-2', 'TKT-1050', 'OAuth Implementation', 'Secure agent-driven auth.', 'In Progress', 'Task', 'plan-1', 'Claude-dev-1',
     'TDR: Auth Implementation', 'markdown', '# Technical Design Record (TDR)\n\n## Proposed Architecture\nImplement Auth0 with PKCE flow for mobile agent worker security.\n\n### Endpoint Mapping\n- `/api/auth/callback`: Redirect handler\n- `/api/proxy/token`: Token exchange service']
];

const insert = db.prepare(`
    INSERT INTO tickets (id, identifier, title, description, status, tier, parent_id, assigned_agent_id, document_name, document_type, document_content)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const t of tickets) insert.run(...t);

console.log(`Successfully seeded tickets with documents.`);
db.close();
