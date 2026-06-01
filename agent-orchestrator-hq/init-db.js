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
    console.log("Generating realistic waterfall hierarchical mock data...");

    db.prepare("DELETE FROM tickets").run();
    
    const today = new Date();
    const formatDate = (date) => date.toISOString().split('T')[0];
    const shiftDate = (days) => formatDate(new Date(today.getTime() + days * 24 * 60 * 60 * 1000));

    const tickets = [];
    let idCounter = 1;

    // Helper to add ticket
    const addTkt = (tier, parentId, title, status, startDays, dueDays, extra = {}) => {
        const id = `${tier.toLowerCase()}-${idCounter++}`;
        const prefix = tier === 'Epic' ? 'EPC' : tier === 'Story' ? 'STR' : tier === 'Task' ? 'TKT' : tier === 'QA' ? 'QA' : 'BUG';
        const identifier = `${prefix}-${1000 + idCounter}`;
        tickets.push({
            id,
            parent_id: parentId,
            identifier,
            title,
            status,
            tier,
            start_date: shiftDate(startDays),
            due_date: shiftDate(dueDays),
            document_name: `${tier} Context: ${title}`,
            document_type: 'markdown',
            document_content: `# ${title}\nContext for ${tier} tier.`,
            ...extra
        });
        return { id, identifier };
    };

    // EPICS (Sequential start dates for waterfall feel at high level)
    const epics = [
        { title: 'Legacy Core Migration', status: 'Done', start: -120, duration: 40 },
        { title: 'Data Lake Foundation', status: 'Done', start: -90, duration: 45 },
        { title: 'AR Spectator Core', status: 'In Progress', start: -50, duration: 150 },
        { title: 'AI Coaching Engine', status: 'In Progress', start: -20, duration: 120 },
        { title: 'Quantum Encryption', status: 'Todo', start: 30, duration: 180 }
    ];

    epics.forEach((ec, eIdx) => {
        const { id: epicId, identifier: epicIdent } = addTkt('Epic', null, ec.title, ec.status, ec.start, ec.start + ec.duration);
        
        // STORIES (Waterfall within each Epic)
        const numStories = 4;
        const storyDuration = Math.floor(ec.duration / (numStories / 1.5));
        let lastStoryIdent = null;

        for (let i = 0; i < numStories; i++) {
            const sStart = ec.start + (i * (storyDuration / 2));
            const sDue = sStart + storyDuration;
            const sStatus = ec.status === 'Done' ? 'Done' : ec.status === 'Todo' ? 'Todo' : (i < 2 ? 'Done' : i === 2 ? 'In Progress' : 'Todo');
            
            const { id: sId, identifier: sIdent } = addTkt('Story', epicId, `${ec.title} Story Ph ${i+1}`, sStatus, sStart, sDue, {
                blocked_by: lastStoryIdent
            });

            // Update previous story if applicable
            if (lastStoryIdent) {
                const prev = tickets.find(t => t.identifier === lastStoryIdent);
                if (prev) prev.blocking = sIdent;
            }
            lastStoryIdent = sIdent;

            // CHILDREN per Story (Waterfall within each Story)
            const numChildren = 4;
            const childDuration = Math.floor(storyDuration / (numChildren / 1.5));
            const childTier = i % 3 === 0 ? 'Task' : i % 3 === 1 ? 'QA' : 'Triage';
            let lastChildIdent = null;

            for (let j = 0; j < numChildren; j++) {
                const cStart = sStart + (j * (childDuration / 2));
                const cDue = cStart + childDuration;
                const cStatus = sStatus === 'Done' ? 'Done' : sStatus === 'Todo' ? 'Todo' : (j < 2 ? 'Done' : 'In Progress');
                
                const { id: cId, identifier: cIdent } = addTkt(childTier, sId, `${ec.title} Execution ${i}-${j}`, cStatus, cStart, cDue, {
                    assigned_agent_id: j % 2 === 0 ? 'Claude-dev-1' : 'GPT-arch-2',
                    execution_flag: 'Autonomous',
                    llm_role: childTier === 'QA' ? 'Tester' : 'Engineer',
                    blocked_by: lastChildIdent
                });

                if (lastChildIdent) {
                    const prevC = tickets.find(t => t.identifier === lastChildIdent);
                    if (prevC) prevC.blocking = cIdent;
                }
                lastChildIdent = cIdent;
            }
        }
    });

    const insert = db.prepare(`
        INSERT INTO tickets (
            id, identifier, title, description, status, tier, parent_id, assigned_agent_id,
            execution_flag, authorized_model, llm_role, personality_vector, 
            expected_token_usage, actual_token_usage, resource_scope, mutation_scope, ttl,
            document_name, document_type, document_content, start_date, due_date, blocked_by, blocking
        ) VALUES (
            @id, @identifier, @title, @description, @status, @tier, @parent_id, @assigned_agent_id,
            @execution_flag, @authorized_model, @llm_role, @personality_vector, 
            @expected_token_usage, @actual_token_usage, @resource_scope, @mutation_scope, @ttl,
            @document_name, @document_type, @document_content, @start_date, @due_date, @blocked_by, @blocking
        )
    `);

    for (const t of tickets) {
        const data = {
            id: null, identifier: null, title: null, description: null, status: null, tier: null, parent_id: null, assigned_agent_id: null,
            execution_flag: null, authorized_model: null, llm_role: null, personality_vector: null, 
            expected_token_usage: null, actual_token_usage: null, resource_scope: null, mutation_scope: null, ttl: null,
            document_name: null, document_type: null, document_content: null, start_date: null, due_date: null, blocked_by: null, blocking: null,
            ...t
        };
        insert.run(data);
    }
    
    console.log(`Mock data seeding complete. Created ${tickets.length} tickets with waterfall schedules and dependencies.`);
}

db.close();
