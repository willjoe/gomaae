const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'ticket-manager.db');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Schema Sync
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
    start_date TEXT,
    due_date TEXT,
    linked_ticket_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, is_active INTEGER DEFAULT 0);
`);

if (process.env.SEED_MOCK_DATA === 'true') {
    console.log("Generating Universal Coverage Waterfall Data...");

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
            description: extra.description || `Structural record for ${title}.`,
            status,
            tier,
            start_date: shiftDate(startDays),
            due_date: shiftDate(dueDays),
            document_name: `${tier} Spec: ${title}`,
            document_type: 'markdown',
            document_content: `# ${title}\nContextual assets for high-integrity SDLC.`,
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

    // 1. PRIMARY EPIC
    const ep1 = addTkt('Epic', null, 'Spatial Neural Hub', 'In Progress', -30, 180);
    
    // Acceptance Test for Epic
    addTkt('QA', ep1.id, `Acceptance Test: ${ep1.title}`, 'Todo', 181, 195, {
        linked_ticket_id: ep1.identifier,
        blocked_by: ep1.identifier,
        llm_role: 'QA Architect'
    });

    // 2. STORIES
    const storyNames = ['Vertex Mesh Engine', 'Shadow Casting V2', 'Physics Collision'];
    storyNames.forEach((sName, sIdx) => {
        const sStart = -20 + (sIdx * 50);
        const s = addTkt('Story', ep1.id, sName, 'In Progress', sStart, sStart + 40);
        
        // Integration Test for Story
        addTkt('QA', s.id, `Integration Test: ${sName}`, 'Todo', sStart + 41, sStart + 48, {
            linked_ticket_id: s.identifier,
            blocked_by: s.identifier,
            llm_role: 'Integration Lead'
        });

        // 3. TASKS
        for (let j = 0; j < 2; j++) {
            const tStart = sStart + (j * 15);
            const t = addTkt('Task', s.id, `${sName} - Module ${j+1}`, 'In Progress', tStart, tStart + 12);
            
            // Unit Test for Task
            addTkt('QA', t.id, `Unit Test: ${t.title}`, 'Todo', tStart + 13, tStart + 15, {
                linked_ticket_id: t.identifier,
                blocked_by: t.identifier,
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
    
    console.log(`Universal Verification Seeding complete. Created ${tickets.length} tickets (1:1 Verification Map).`);
}

db.close();
