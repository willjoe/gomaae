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
    console.log("Restoring Massive Hierarchical Waterfall Data with Two-Tier Persistence...");

    systemDb.prepare("DELETE FROM projects").run();

    const workspaceRoot = '/Users/will/Agentic/agentic-engineering-hq';
    systemDb.prepare("INSERT INTO projects (id, name, description, is_active, workspace_root) VALUES (?, ?, ?, ?, ?)")
      .run('proj-1', 'Agentic Engineering HQ', 'Sustainable high-integrity AI orchestration.', 1, workspaceRoot);

    const projectDb = initProjectDb(workspaceRoot);
    projectDb.prepare("DELETE FROM tickets").run();
    projectDb.prepare("DELETE FROM agent_roles").run();

    // 0. SEED ROLES
    const roles = [
        { id: 'role-1', name: 'Product Architect', description: 'Define structural pillars and coordinate high-level waterfall progression.' },
        { id: 'role-2', name: 'Backend Engineer', description: 'Implement high-integrity API logic and secure data mutations.' },
        { id: 'role-3', name: 'Frontend Engineer', description: 'Build verified UI components following strict design standards.' },
        { id: 'role-4', name: 'Functional QA Eng', description: 'Execute deterministic verification cycles and SRT simulations.' },
        { id: 'role-5', name: 'Security Engineer', description: 'Enforce VFS security policies and mutation authorization.' }
    ];
    const insertRole = projectDb.prepare('INSERT INTO agent_roles (id, name, description) VALUES (?, ?, ?)');
    roles.forEach(r => insertRole.run(r.id, r.name, r.description));

    // 1. GLOBAL STRATEGY PILLARS (Physical Files)
    const strategyDocs = [
        { id: 'brief-problem', name: 'Problem Definition.md', path: '/Global/Briefs/Problem Definition.md', content: '# Problem Definition\nCurrent AI agent development lacks strict security boundaries and high-integrity verification cycles.' },
        { id: 'brief-market', name: 'Customer & Market.md', path: '/Global/Briefs/Customer & Market.md', content: '# Customer & Market\nEnterprises requiring autonomous AI workflows without compromising on safety.' },
        { id: 'brief-uvp', name: 'Unique Value Proposition.md', path: '/Global/Briefs/Unique Value Proposition.md', content: '# Unique Value Proposition\nA Dockerized orchestration hub that binds AI agents to specific, cryptographically-signed tickets.' },
        { id: 'brief-entry', name: 'Market Entry.md', path: '/Global/Briefs/Market Entry.md', content: '# Market Entry\nInitialize as a developer tool for high-compliance industries.' },
        { id: 'brief-feasibility', name: 'Feasibility.md', path: '/Global/Briefs/Feasibility.md', content: '# Feasibility\nLeverages existing mature technologies like Docker and SQLite-vec.' },
        { id: 'brief-value', name: 'Business Value.md', path: '/Global/Briefs/Business Value.md', content: '# Business Value\nReduces human-in-the-loop overhead by 60%.' },
        { id: 'guardrail-core', name: 'Orchestration_Guardrails.md', path: '/Global/Guardrails/Orchestration_Guardrails.md', content: '# Orchestration Guardrails\n- **Token Limit**: 500k per agent\n- **Retry Cap**: 3 failed attempts.' }
    ];

    strategyDocs.forEach(d => {
        createFile(workspaceRoot, d.path, d.content);
        projectDb.prepare(`INSERT INTO tickets (id, identifier, title, tier, document_name, document_type, document_content, document_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
            d.id, `STRAT-${1000 + Math.floor(Math.random()*900)}`, d.name.replace('.md', ''), 'Epic', d.name.replace('.md', ''), 'markdown', d.content, d.path
        );
    });

    const today = new Date();
    const formatDate = (date) => date.toISOString().split('T')[0];

    // Helper to add ticket
    const addTkt = (tier, parentId, title, status, startDays, dueDays) => {
        const id = `${tier.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`;
        const prefix = tier === 'Epic' ? 'EPC' : tier === 'Story' ? 'STR' : tier === 'Task' ? 'TKT' : tier === 'QA' ? 'QA' : 'BUG';
        const identifier = `${prefix}-${1000 + Math.floor(Math.random() * 9000)}`;
        
        const start = new Date(today.getTime() + startDays * 24 * 60 * 60 * 1000);
        const due = new Date(today.getTime() + dueDays * 24 * 60 * 60 * 1000);

        let documentPath = null;
        if (tier === 'Epic') {
            documentPath = `/Domains/${title.replace(/ /g, '_')}/[Specification] ${title}.md`;
        } else if (tier === 'Story' && parentId) {
            const parent = projectDb.prepare('SELECT title FROM tickets WHERE id = ?').get(parentId);
            documentPath = `/Domains/${parent.title.replace(/ /g, '_')}/Features/${title.replace(/ /g, '_')}/[TDD] ${title}.md`;
        }

        if (documentPath) {
            createFile(workspaceRoot, documentPath, `# ${title}\nContext for ${tier} tier.`);
        }

        projectDb.prepare(`
            INSERT INTO tickets (
                id, identifier, title, description, status, tier, parent_id, 
                start_date, due_date, document_name, document_type, document_content, document_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, identifier, title, `High-integrity record for ${title}.`, 
            status, tier, parentId, 
            formatDate(start), formatDate(due),
            documentPath ? path.basename(documentPath) : null, 
            documentPath ? 'markdown' : null,
            documentPath ? `# ${title}\nContext content.` : null,
            documentPath
        );

        return { id, identifier, title };
    };

    // 2. WATERFALL HIERARCHY
    const epicConfigs = [
        { title: 'Billing_Infrastructure', status: 'Done', start: -120, duration: 60 },
        { title: 'Spatial_Audio_Engine', status: 'In Progress', start: -40, duration: 150 },
        { title: 'Neural_Network_Registry', status: 'In Review', start: 20, duration: 120 }
    ];

    epicConfigs.forEach((ec) => {
        const epic = addTkt('Epic', null, ec.title, ec.status, ec.start, ec.start + ec.duration);
        
        const storyDuration = Math.floor(ec.duration / 4);
        for (let i = 0; i < 4; i++) {
            const sStart = ec.start + (i * storyDuration) + 2;
            const sDue = sStart + storyDuration - 5;
            let sStatus = ec.status === 'Done' ? 'Done' : (i < 2 ? 'Done' : 'In Progress');

            const story = addTkt('Story', epic.id, `${ec.title} Ph ${i+1}`, sStatus, sStart, sDue);
            
            // Link QA
            const qaId = `qa-story-${Math.random().toString(36).substr(2, 9)}`;
            const qaIdent = `QA-${story.identifier.split('-')[1] || i}`;
            const qaStart = formatDate(new Date(today.getTime() + (sDue + 1) * 24 * 60 * 60 * 1000));
            projectDb.prepare('INSERT INTO tickets (id, identifier, title, status, tier, start_date, linked_ticket_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                qaId, qaIdent, `Verify: ${story.title}`, sStatus === 'Done' ? 'Done' : 'Todo', 'QA', qaStart, story.id
            );

            const taskDuration = Math.floor(storyDuration / 4);
            for (let j = 0; j < 4; j++) {
                const tStart = sStart + (j * taskDuration) + 1;
                const tDue = tStart + taskDuration - 2;
                let tStatus = sStatus === 'Done' ? 'Done' : (j < 2 ? 'Done' : 'In Progress');

                addTkt('Task', story.id, `${story.title} Dev ${j+1}`, tStatus, tStart, tDue);
            }
        }
    });

    console.log("Hierarchical Seeding Complete.");
}

systemDb.close();
