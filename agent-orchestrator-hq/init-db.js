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

  CREATE TABLE IF NOT EXISTS service_accounts (
    id TEXT PRIMARY KEY,
    name TEXT,
    platform TEXT,
    iam_roles TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

const createFile = (root, relativePath, content) => {
    const fullPath = path.join(root, 'DocsAssets', relativePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content);
};

if (process.env.SEED_MOCK_DATA === 'true') {
    console.log("Seeding High-Integrity Unified Workspace (Filesystem Truth)...");

    systemDb.prepare("DELETE FROM projects").run();

    const workspaceRoot = '/Users/will/Agentic/agentic-engineering-hq';
    systemDb.prepare("INSERT INTO projects (id, name, description, is_active, workspace_root) VALUES (?, ?, ?, ?, ?)")
      .run('proj-1', 'Agentic Engineering HQ', 'Sustainable high-integrity AI orchestration.', 1, workspaceRoot);

    const projectDb = initProjectDb(workspaceRoot);
    projectDb.prepare("DELETE FROM tickets").run();
    projectDb.prepare("DELETE FROM agent_roles").run();

    // 1. GLOBAL STRATEGY (Filesystem Truth)
    const strategyDocs = [
        { 
            name: 'Problem Definition.md', 
            path: '/Global/Briefs/Problem Definition.md', 
            content: '# Problem Definition\nCurrent AI agent development lacks strict security boundaries and high-integrity verification cycles, leading to unpredictable code quality and potential data leakage.' 
        },
        { 
            name: 'Customer & Market.md', 
            path: '/Global/Briefs/Customer & Market.md', 
            content: '# Customer & Market\nEnterprises and high-security software teams requiring autonomous AI workflows without compromising on safety.' 
        },
        { 
            name: 'Unique Value Proposition.md', 
            path: '/Global/Briefs/Unique Value Proposition.md', 
            content: '# Unique Value Proposition\nA Dockerized orchestration hub that binds AI agents to specific, cryptographically-signed tickets.' 
        },
        { 
            name: 'Market Entry.md', 
            path: '/Global/Briefs/Market Entry.md', 
            content: '# Market Entry\nInitialize as a developer tool for high-compliance industries.' 
        },
        { 
            name: 'Feasibility.md', 
            path: '/Global/Briefs/Feasibility.md', 
            content: '# Feasibility\nLeverages existing mature technologies like Docker and SQLite-vec.' 
        },
        { 
            name: 'Business Value.md', 
            path: '/Global/Briefs/Business Value.md', 
            content: '# Business Value\nReduces human-in-the-loop overhead by 60%.' 
        },
        { 
            name: 'Orchestration_Guardrails.md', 
            path: '/Global/Guardrails/Orchestration_Guardrails.md', 
            content: '# Orchestration Guardrails\n- **Token Limit**: 500k per agent\n- **Retry Cap**: 3 failed attempts.' 
        }
    ];

    strategyDocs.forEach(d => {
        createFile(workspaceRoot, d.path, d.content);
        projectDb.prepare(`INSERT INTO tickets (id, identifier, title, tier, document_name, document_type, document_content, document_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
            `brief-${Math.random().toString(36).substr(2, 5)}`, `STRAT-${Math.floor(Math.random()*900)}`, d.name.replace('.md', ''), 'Epic', d.name.replace('.md', ''), 'markdown', d.content, d.path
        );
    });

    // 2. DOMAINS & FEATURES (Filesystem Truth)
    const domainDocs = [
        { 
            path: '/Domains/Billing_&_Payment/[Specification] Billing Plan Requirements.md', 
            content: '# Billing Plan Spec\nLatest truth for subscription logic.' 
        },
        { 
            path: '/Domains/Billing_&_Payment/Features/Credit_Card_Payment/[TDD] Card Validation & Processing.md', 
            content: '# TDD: Card Validation\nClient-side validation rules.' 
        },
        { 
            path: '/Domains/Billing_&_Payment/Features/Credit_Card_Payment/Evidences/202606_Initial_Release/img_tc101_success_20260603.png', 
            content: 'FAKE_IMAGE_DATA' 
        }
    ];

    domainDocs.forEach(d => {
        createFile(workspaceRoot, d.path, d.content);
        const name = path.basename(d.path);
        projectDb.prepare(`INSERT INTO tickets (id, identifier, title, tier, document_name, document_type, document_content, document_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
            `doc-${Math.random().toString(36).substr(2, 5)}`, `DOC-${Math.floor(Math.random()*900)}`, name, 'Story', name, name.endsWith('.md') ? 'markdown' : 'binary', d.content, d.path
        );
    });

    console.log("Unified Workspace Seeding Complete.");
}

systemDb.close();
