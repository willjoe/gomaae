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
ensureColumn('tickets', 'linked_ticket_id', 'TEXT');
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
    console.log("Restoring Massive Hierarchical Waterfall Data with Universal Verification...");

    db.prepare("DELETE FROM tickets").run();
    
    const today = new Date();
    const formatDate = (date) => date.toISOString().split('T')[0];
    const shiftDate = (days) => formatDate(new Date(today.getTime() + days * 24 * 60 * 60 * 1000));

    const structuralTickets = [];
    const qaTickets = [];
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
            description: `High-integrity record for ${title}.`,
            status,
            tier,
            start_date: shiftDate(startDays),
            due_date: shiftDate(dueDays),
            document_name: `${tier} Spec: ${identifier}`,
            document_type: 'markdown',
            document_content: `# ${title}`,
            execution_flag: 'Autonomous',
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
        structuralTickets.push(tkt);
        return tkt;
    };

    // 1. EPICS (5: 1 Done, 2 In Progress, 2 Todo)
    const epicConfigs = [
        { title: 'Legacy Core Migration', status: 'Done', start: -120, duration: 60 },
        { title: 'Spatial Audio Hub', status: 'In Progress', start: -40, duration: 150 },
        { title: 'Neural Compute Mesh', status: 'In Progress', start: 20, duration: 120 },
        { title: 'Global Auth v2', status: 'Todo', start: 180, duration: 90 },
        { title: 'Quantum Ledger', status: 'Todo', start: 280, duration: 120 }
    ];

    epicConfigs.forEach((ec) => {
        const epic = addTkt('Epic', null, ec.title, ec.status, ec.start, ec.start + ec.duration);
        
        // 2. STORIES (4 per Epic)
        let lastSIdent = null;
        const storyDuration = Math.floor(ec.duration / 4);
        for (let i = 0; i < 4; i++) {
            const sStart = ec.start + (i * storyDuration) + 2;
            const sDue = sStart + storyDuration - 5;
            const sStatus = ec.status === 'Done' ? 'Done' : (ec.status === 'Todo' ? 'Todo' : (i < 2 ? 'Done' : 'In Progress'));
            
            const story = addTkt('Story', epic.id, `${ec.title} Ph ${i+1}`, sStatus, sStart, sDue, {
                blocked_by: lastSIdent
            });

            // Logical Bidirectional link for Story
            if (lastSIdent) {
                const prevS = structuralTickets.find(t => t.identifier === lastSIdent);
                if (prevS) prevS.blocking = story.identifier;
            }
            lastSIdent = story.identifier;

            // 3. TASKS (4 per Story)
            let lastTIdent = null;
            const taskDuration = Math.floor(storyDuration / 4);
            for (let j = 0; j < 4; j++) {
                const tStart = sStart + (j * taskDuration) + 1;
                const tDue = tStart + taskDuration - 2;
                const tStatus = sStatus === 'Done' ? 'Done' : (sStatus === 'Todo' ? 'Todo' : (j < 2 ? 'Done' : 'In Progress'));
                
                const task = addTkt('Task', story.id, `${story.title} - Dev ${j+1}`, tStatus, tStart, tDue, {
                    blocked_by: lastTIdent
                });

                if (lastTIdent) {
                    const prevT = structuralTickets.find(t => t.identifier === lastTIdent);
                    if (prevT) prevT.blocking = task.identifier;
                }
                lastTIdent = task.identifier;
            }

            // 4. TRIAGE (Operation tickets for stories)
            if (i < 2 && ec.status !== 'Todo') {
                addTkt('Triage', story.id, `${story.title} - Hotfix`, 'Todo', sDue + 1, sDue + 5, {
                    llm_role: 'SRE'
                });
            }
        }
    });

    // 5. UNIVERSAL VERIFICATION (1:1 QA mapping)
    structuralTickets.slice().forEach(t => {
        const start = new Date(t.due_date);
        start.setDate(start.getDate() + 1);
        const due = new Date(start);
        due.setDate(due.getDate() + 4);
        
        qaTickets.push({
            id: `qa-${t.id}`,
            parent_id: t.parent_id,
            identifier: `QA-${t.identifier.split('-')[1]}`,
            title: `Verify: ${t.title}`,
            description: `Verification gate for ${t.identifier}.`,
            status: t.status === 'Done' ? 'Done' : 'Todo',
            tier: 'QA',
            start_date: formatDate(start),
            due_date: formatDate(due),
            document_name: `Test Plan: ${t.identifier}`,
            document_type: 'markdown',
            document_content: `# Verification for ${t.identifier}`,
            execution_flag: 'Assisted',
            authorized_model: 'claude-3-5-sonnet',
            llm_role: 'QA Engineer',
            personality_vector: null,
            expected_token_usage: 10000,
            actual_token_usage: 0,
            resource_scope: null,
            mutation_scope: null,
            ttl: null,
            blocked_by: t.identifier,
            blocking: null,
            linked_ticket_id: t.identifier,
            assigned_agent_id: 'GPT-arch-2'
        });
        
        // Update structural ticket to know it is blocking its test
        const struct = structuralTickets.find(st => st.id === t.id);
        if (struct) {
            const qaIdent = `QA-${t.identifier.split('-')[1]}`;
            struct.blocking = struct.blocking ? `${struct.blocking}, ${qaIdent}` : qaIdent;
        }
    });

    const allTickets = [...structuralTickets, ...qaTickets];

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

    for (const t of allTickets) {
        const data = {
            description: null, personality_vector: null, expected_token_usage: null, actual_token_usage: null,
            resource_scope: null, mutation_scope: null, ttl: null, ...t
        };
        insert.run(data);
    }
    
    console.log(`Revival complete. Restored ${allTickets.length} tickets with universal verification and strict waterfall.`);
}

db.close();
