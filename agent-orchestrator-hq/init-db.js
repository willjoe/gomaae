const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const SYSTEM_DB_PATH = path.join(__dirname, 'data', 'system.db');
const dataDir = path.dirname(SYSTEM_DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 1. SYSTEM DATABASE: Global Project Registry
const systemDb = new Database(SYSTEM_DB_PATH);
systemDb.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY, 
    name TEXT, 
    description TEXT, 
    workspace_root TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    is_active INTEGER DEFAULT 0
  );
  
  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY, 
    value TEXT
  );
`);

// 2. PROJECT DATABASE HELPER
const initProjectDb = (workspaceRoot) => {
    const ticketsDir = path.join(workspaceRoot, 'Tickets');
    const logsDir = path.join(workspaceRoot, 'Logs');
    const configDir = path.join(workspaceRoot, 'Config');
    const repoDir = path.join(workspaceRoot, 'Repository');
    const docsDir = path.join(workspaceRoot, 'DocsAssets');

    [ticketsDir, logsDir, configDir, repoDir, docsDir].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    const projectDbPath = path.join(ticketsDir, 'project.db');
    const db = new Database(projectDbPath);

    // Load sqlite-vec if available
    try {
        const sqliteVec = require('sqlite-vec');
        sqliteVec.load(db);
    } catch (e) {}

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
        document_path TEXT,
        start_date TEXT,
        due_date TEXT,
        vector_embedding BLOB,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        linked_ticket_id TEXT
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS vec_tickets USING vec0(
        ticket_id TEXT PRIMARY KEY,
        embedding FLOAT[256]
      );

      CREATE TABLE IF NOT EXISTS agent_roles (
        id TEXT PRIMARY KEY,
        name TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

      CREATE TABLE IF NOT EXISTS project_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS available_models (
        id TEXT PRIMARY KEY,
        provider_id TEXT,
        name TEXT,
        type TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    return db;
};

if (process.env.SEED_MOCK_DATA === 'true') {
    console.log("Seeding High-Integrity Unified Workspace...");

    systemDb.prepare("DELETE FROM projects").run();

    const workspaceRoot = '/Users/will/Agentic/agentic-engineering-hq';
    systemDb.prepare("INSERT INTO projects (id, name, description, is_active, workspace_root) VALUES (?, ?, ?, ?, ?)")
      .run('proj-1', 'Agentic Engineering HQ', 'Sustainable high-integrity AI orchestration.', 1, workspaceRoot);

    const projectDb = initProjectDb(workspaceRoot);
    projectDb.prepare("DELETE FROM tickets").run();
    projectDb.prepare("DELETE FROM agent_roles").run();

    // Seed Roles
    const roles = [
        { id: 'role-1', name: 'Product Architect', description: 'Define structural pillars.' },
        { id: 'role-2', name: 'Backend Engineer', description: 'Implement API logic.' }
    ];
    const insertRole = projectDb.prepare('INSERT INTO agent_roles (id, name, description) VALUES (?, ?, ?)');
    roles.forEach(r => insertRole.run(r.id, r.name, r.description));

    // Seed Strategic Briefs as Tickets (for UI compatibility)
    const strategyDocs = [
        { id: 'brief-problem', name: 'Problem Definition', path: '/Global/Briefs/Problem Definition.md', content: '# Problem Definition\nCurrent AI agent development lacks security boundaries.' },
        { id: 'brief-value', name: 'Business Value', path: '/Global/Briefs/Business Value.md', content: '# Business Value\nReduces overhead by 60%.' }
    ];

    strategyDocs.forEach(d => {
        projectDb.prepare(`INSERT INTO tickets (id, identifier, title, tier, document_name, document_type, document_content, document_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
            d.id, `STRAT-${Math.floor(Math.random()*900)}`, d.name, 'Epic', d.name, 'markdown', d.content, d.path
        );
    });

    console.log("Unified Workspace Seeding Complete.");
}

systemDb.close();
