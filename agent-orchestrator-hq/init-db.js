const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'ticket-manager.db');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize high-integrity schema
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
    branch_name TEXT,
    repo_url TEXT,
    linear_updated_at TEXT,
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

console.log("High-Integrity Database schema initialized.");

// Conditional seeding of mock data based on environment variables
if (process.env.SEED_MOCK_DATA === 'true') {
    console.log("Environment SEED_MOCK_DATA=true detected. Seeding truthful mock data...");

    // 1. Initial Project
    const projExists = db.prepare('SELECT id FROM projects WHERE id = ?').get('proj-1');
    if (!projExists) {
        db.prepare(`INSERT INTO projects (id, name, description, is_active) VALUES (?, ?, ?, ?)`).run(
            'proj-1', 'Agentic Engineering HQ', 'Core platform for AI orchestration.', 1
        );
    }

    // 2. Truthful Tickets (Purging existing dev tickets first for a clean state)
    db.prepare("DELETE FROM tickets WHERE id LIKE 'init-%' OR id LIKE 'plan-%' OR id LIKE 'dev-%'").run();
    
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

    const insertTicket = db.prepare(`
        INSERT INTO tickets (id, identifier, title, description, status, tier, parent_id, assigned_agent_id, document_name, document_type, document_content)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const t of tickets) insertTicket.run(...t);
    
    console.log("Mock data seeding complete.");
} else {
    console.log("No seeding required (SEED_MOCK_DATA != true).");
}

db.close();
