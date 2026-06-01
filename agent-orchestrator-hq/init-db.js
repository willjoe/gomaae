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
ensureColumn('tickets', 'linked_ticket_id', 'TEXT'); // NEW: Link for verification
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, is_active INTEGER DEFAULT 0);
`);

if (process.env.SEED_MOCK_DATA === 'true') {
    console.log("Generating Tiered Verification waterfall data...");

    db.prepare("DELETE FROM tickets").run();
    
    const today = new Date();
    const formatDate = (date) => date.toISOString().split('T')[0];
    const shiftDate = (days) => formatDate(new Date(today.getTime() + days * 24 * 60 * 60 * 1000));

    const tickets = [];
    let idCounter = 1;

    const addTkt = (tier, parentId, title, status, startDays, dueDays, extra = {}) => {
        const id = `${tier.toLowerCase()}-${idCounter++}`;
        const prefix = tier === 'Epic' ? 'EPC' : tier === 'Story' ? 'STR' : tier === 'Task' ? 'TKT' : tier === 'QA' ? 'QA' : 'BUG';
        const identifier = `${prefix}-${1000 + idCounter}`;
        const tkt = {
            id,
            parent_id: parentId,
            identifier,
            title,
            description: extra.description || `High-integrity record for ${title}.`,
            status,
            tier,
            start_date: shiftDate(startDays),
            due_date: shiftDate(dueDays),
            document_name: `${tier} Spec: ${title}`,
            document_type: 'markdown',
            document_content: `# ${title}\nVerification assets for ${tier} tier.`,
            execution_flag: extra.execution_flag || 'Autonomous',
            authorized_model: 'claude-3-5-sonnet',
            llm_role: extra.llm_role || 'Generalist',
            personality_vector: null,
            expected_token_usage: 50000,
            actual_token_usage: 5000,
            resource_scope: null,
            mutation_scope: null,
            ttl: null,
            blocked_by: extra.blocked_by || null,
            blocking: extra.blocking || null,
            linked_ticket_id: extra.linked_ticket_id || null,
            assigned_agent_id: extra.assigned_agent_id || 'Claude-dev-1'
        };
        tickets.push(tkt);
        return tkt;
    };

    // 1. PRIMARY EPIC + Acceptance Test
    const ep1 = addTkt('Epic', null, 'Spatial Audio Engine', 'In Progress', -30, 150);
    addTkt('QA', ep1.id, `Acceptance Test: ${ep1.title}`, 'Todo', 151, 160, {
        linked_ticket_id: ep1.identifier,
        blocked_by: ep1.identifier,
        description: 'Verifies the high-level strategic requirements for the Spatial Audio Engine.',
        llm_role: 'QA Lead'
    });

    // 2. STORIES (Planning) + Integration Tests
    let lastS = null;
    const stories = ['3D Panning Logic', 'HRTF Modeling', 'Reverb Geometry'];
    
    stories.forEach((name, i) => {
        const sStart = -20 + (i * 40);
        const s = addTkt('Story', ep1.id, name, 'In Progress', sStart, sStart + 30, {
            blocked_by: lastS ? lastS.identifier : null
        });
        if (lastS) {
            const prev = tickets.find(t => t.id === lastS.id);
            if (prev) prev.blocking = s.identifier;
        }
        lastS = s;

        // Integration Test for Story
        addTkt('QA', s.id, `Integration Test: ${s.title}`, 'Todo', sStart + 31, sStart + 36, {
            linked_ticket_id: s.identifier,
            blocked_by: s.identifier,
            description: `Validates functional integration for ${s.title}.`,
            llm_role: 'QA Engineer'
        });

        // 3. TASKS (Dev) + Unit Tests
        let lastT = null;
        for (let j = 0; j < 3; j++) {
            const tStart = sStart + (j * 10);
            const t = addTkt('Task', s.id, `${name} Module ${j+1}`, 'In Progress', tStart, tStart + 8, {
                blocked_by: lastT ? lastT.identifier : null
            });
            if (lastT) {
                const prevT = tickets.find(tk => tk.id === lastT.id);
                if (prevT) prevT.blocking = t.identifier;
            }
            lastT = t;

            // Unit Test for Task
            addTkt('QA', t.id, `Unit Test: ${t.title}`, 'Todo', tStart + 9, tStart + 11, {
                linked_ticket_id: t.identifier,
                blocked_by: t.identifier,
                description: `Deterministic unit verification for component code.`,
                llm_role: 'SDET'
            });
        }
    });

    const insert = db.prepare(`
        INSERT INTO tickets (
            id, identifier, title, description, status, tier, parent_id, assigned_agent_id,
            execution_flag, authorized_model, llm_role, personality_vector, 
            expected_token_usage, actual_token_usage, resource_scope, mutation_scope, ttl,
            document_name, document_type, document_content, start_date, due_date, blocked_by, blocking, linked_ticket_id
        ) VALUES (
            @id, @identifier, @title, @description, @status, @tier, @parent_id, @assigned_agent_id,
            @execution_flag, @authorized_model, @llm_role, @personality_vector, 
            @expected_token_usage, @actual_token_usage, @resource_scope, @mutation_scope, @ttl,
            @document_name, @document_type, @document_content, @start_date, @due_date, @blocked_by, @blocking, @linked_ticket_id
        )
    `);

    for (const t of tickets) {
        insert.run(t);
    }
    
    console.log(`Mock data seeding complete. Created ${tickets.length} tickets with tiered verification mapping.`);
}

db.close();
