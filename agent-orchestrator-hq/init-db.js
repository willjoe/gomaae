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
    console.log("Generating explicit waterfall dependencies for STR-1015 and STR-1020...");

    db.prepare("DELETE FROM tickets").run();
    
    const today = new Date();
    const formatDate = (date) => date.toISOString().split('T')[0];
    const shiftDate = (days) => formatDate(new Date(today.getTime() + days * 24 * 60 * 60 * 1000));

    const tickets = [];

    const addRawTkt = (data) => {
        tickets.push({
            id: data.id,
            parent_id: data.parent_id || null,
            identifier: data.identifier,
            title: data.title,
            description: data.description || `High-integrity record for ${data.identifier}.`,
            status: data.status || 'In Progress',
            tier: data.tier,
            start_date: shiftDate(data.start),
            due_date: shiftDate(data.due),
            document_name: `${data.tier} Spec: ${data.identifier}`,
            document_type: 'markdown',
            document_content: `# ${data.title}`,
            execution_flag: 'Autonomous',
            authorized_model: 'claude-3-5-sonnet',
            llm_role: 'Engineer',
            blocked_by: data.blocked_by || null,
            blocking: data.blocking || null,
            linked_ticket_id: data.linked_ticket_id || null,
            assigned_agent_id: 'Claude-dev-1'
        });
    };

    // EPIC A
    addRawTkt({ id: 'epic-1', identifier: 'EPC-1001', tier: 'Epic', title: 'Legacy Core Migration', start: -100, due: 0 });
    
    // STORIES for EPIC A
    addRawTkt({ id: 'story-1', parent_id: 'epic-1', identifier: 'STR-1005', tier: 'Story', title: 'Data Audit', start: -95, due: -70 });
    addRawTkt({ id: 'story-2', parent_id: 'epic-1', identifier: 'STR-1010', tier: 'Story', title: 'Schema Mapping', start: -69, due: -35, blocked_by: 'STR-1005' });
    addRawTkt({ id: 'story-3', parent_id: 'epic-1', identifier: 'STR-1015', tier: 'Story', title: 'Migration Pilot', start: -34, due: 0, blocked_by: 'STR-1010', blocking: 'STR-1020' });

    // EPIC B
    addRawTkt({ id: 'epic-2', identifier: 'EPC-1002', tier: 'Epic', title: 'Global Auth v2', start: 5, due: 150 });
    
    // STORIES for EPIC B (STR-1020 is first)
    addRawTkt({ id: 'story-4', parent_id: 'epic-2', identifier: 'STR-1020', tier: 'Story', title: 'Auth Core Auth', start: 5, due: 40, blocked_by: 'STR-1015', blocking: 'STR-1025' });
    addRawTkt({ id: 'story-5', parent_id: 'epic-2', identifier: 'STR-1025', tier: 'Story', title: 'OAuth Integration', start: 41, due: 80, blocked_by: 'STR-1020' });

    // TASKS for STR-1020
    addRawTkt({ id: 'task-1', parent_id: 'story-4', identifier: 'TKT-1030', tier: 'Task', title: 'RSA Key Management', start: 6, due: 15 });
    addRawTkt({ id: 'task-2', parent_id: 'story-4', identifier: 'TKT-1035', tier: 'Task', title: 'JWT Implementation', start: 16, due: 30, blocked_by: 'TKT-1030' });

    // QA Tickets (Shadow Map)
    tickets.slice().forEach(t => {
        if (t.tier !== 'QA') {
            const start = new Date(t.due_date);
            start.setDate(start.getDate() + 1);
            const due = new Date(start);
            due.setDate(due.getDate() + 5);
            
            tickets.push({
                ...t,
                id: `qa-${t.id}`,
                identifier: `QA-${t.identifier.split('-')[1]}`,
                title: `Verify: ${t.title}`,
                tier: 'QA',
                linked_ticket_id: t.identifier,
                blocked_by: t.identifier,
                start_date: formatDate(start),
                due_date: formatDate(due),
                blocking: null
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
        const data = {
            description: null, personality_vector: null, expected_token_usage: null, actual_token_usage: null,
            resource_scope: null, mutation_scope: null, ttl: null, ...t
        };
        insert.run(data);
    }
    
    console.log(`Explicit waterfall seeded. Created ${tickets.length} tickets including STR-1015 -> STR-1020 chain.`);
}

db.close();
