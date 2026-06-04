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
ensureColumn('tickets', 'document_path', 'TEXT');
ensureColumn('tickets', 'start_date', 'TEXT');
ensureColumn('tickets', 'due_date', 'TEXT');
ensureColumn('tickets', 'vector_embedding', 'BLOB');
ensureColumn('tickets', 'linked_ticket_id', 'TEXT');
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
    console.log("Seeding OO-DDD Documentation & Evidence Vault...");

    db.prepare("DELETE FROM tickets").run();
    db.prepare("DELETE FROM agent_roles").run();
    db.prepare("DELETE FROM projects").run();

    // 1. PROJECT
    db.prepare("INSERT INTO projects (id, name, description, is_active) VALUES (?, ?, ?, ?)")
      .run('proj-1', 'Agentic Engineering HQ', 'Sustainable high-integrity AI orchestration.', 1);

    // 2. GLOBAL STRATEGY
    const globalDocs = [
        { 
            id: 'global-brief-orchestration', 
            name: 'Orchestration_Core', 
            path: '/Global/Briefs/Orchestration_Core', 
            content: '# Core Strategy Brief: Orchestration\n\n## Intent\nEnable deterministic management of autonomous workers.' 
        },
        { 
            id: 'global-guardrail-orchestration', 
            name: 'Orchestration_Guardrails', 
            path: '/Global/Guardrails/Orchestration_Guardrails', 
            content: '# Guardrails: Orchestration\n\n- **Token Limit**: 500k per agent\n- **Retry Cap**: 3 failed attempts before human gate.' 
        },
        { 
            id: 'global-arch-data', 
            name: 'Global_Data_Model', 
            path: '/Global/Architecture_Design/Global_Data_Model', 
            content: '# Architecture: Global Data Model\n\nSchema definitions for project isolation and high-integrity audit trails.' 
        }
    ];

    globalDocs.forEach(d => {
        db.prepare(`INSERT INTO tickets (id, identifier, title, tier, project_id, document_name, document_type, document_content, document_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            d.id, `GLB-${Math.floor(Math.random()*900)}`, d.name, 'Epic', 'proj-1', d.name, 'markdown', d.content, d.path
        );
    });

    // 3. DOMAINS & FEATURES
    const domains = [
        { 
            name: 'Billing_&_Payment',
            specs: [
                { name: '[Specification] Billing Plan Requirements', path: '/Domains/Billing_&_Payment/[Specification] Billing Plan Requirements', content: '# Billing Plan Spec\nLatest truth for subscription logic.' },
                { name: '[TDD] Stripe Integration Specs', path: '/Domains/Billing_&_Payment/[TDD] Stripe Integration Specs', content: '# TDD: Stripe Integration\nAPI endpoints and webhook handling.' }
            ],
            features: [
                {
                    name: 'Credit_Card_Payment',
                    docs: [
                        { name: '[TDD] Card Validation & Processing', path: '/Domains/Billing_&_Payment/Features/Credit_Card_Payment/[TDD] Card Validation & Processing', content: '# TDD: Card Validation\nClient-side validation rules.' },
                        { name: '[QA] Payment Test Cases', path: '/Domains/Billing_&_Payment/Features/Credit_Card_Payment/[QA] Payment Test Cases', content: '# QA: Payment Test Cases\n- tc101: Valid VISA\n- tc102: Expired Card' }
                    ],
                    evidences: [
                        { name: 'img_tc101_success_20260603.png', path: '/Domains/Billing_&_Payment/Features/Credit_Card_Payment/Evidences/202606_Initial_Release/img_tc101_success_20260603.png', type: 'image' },
                        { name: 'vid_tc102_failed_20260603.mp4', path: '/Domains/Billing_&_Payment/Features/Credit_Card_Payment/Evidences/202606_Initial_Release/vid_tc102_failed_20260603.mp4', type: 'video' }
                    ]
                }
            ]
        }
    ];

    domains.forEach(domain => {
        // Domain Root Specs
        domain.specs.forEach(s => {
            db.prepare(`INSERT INTO tickets (id, identifier, title, tier, project_id, document_name, document_type, document_content, document_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
                `spec-${Math.random().toString(36).substr(2, 9)}`, `DOM-${Math.floor(Math.random()*900)}`, s.name, 'Epic', 'proj-1', s.name, 'markdown', s.content, s.path
            );
        });

        // Features
        domain.features.forEach(feat => {
            feat.docs.forEach(fd => {
                db.prepare(`INSERT INTO tickets (id, identifier, title, tier, project_id, document_name, document_type, document_content, document_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
                    `feat-doc-${Math.random().toString(36).substr(2, 9)}`, `FEAT-${Math.floor(Math.random()*900)}`, fd.name, 'Story', 'proj-1', fd.name, 'markdown', fd.content, fd.path
                );
            });

            // Evidences (Mocked as documents for UI visibility)
            feat.evidences.forEach(ev => {
                db.prepare(`INSERT INTO tickets (id, identifier, title, tier, project_id, document_name, document_type, document_content, document_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
                    `ev-${Math.random().toString(36).substr(2, 9)}`, `EVID-${Math.floor(Math.random()*900)}`, ev.name, 'QA', 'proj-1', ev.name, ev.type, `Evidence File Path: ${ev.path}`, ev.path
                );
            });
        });
    });

    console.log("OO-DDD Seeding Complete.");
}

db.close();
