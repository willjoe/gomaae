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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, is_active INTEGER DEFAULT 0);
`);

if (process.env.SEED_MOCK_DATA === 'true') {
    console.log("Generating explicit high-integrity waterfall dependencies...");

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
            description: null,
            status,
            tier,
            start_date: shiftDate(startDays),
            due_date: shiftDate(dueDays),
            document_name: `${tier} Context: ${title}`,
            document_type: 'markdown',
            document_content: `# ${title}\nContext for ${tier} tier.`,
            execution_flag: null,
            authorized_model: null,
            llm_role: null,
            personality_vector: null,
            expected_token_usage: null,
            actual_token_usage: null,
            resource_scope: null,
            mutation_scope: null,
            ttl: null,
            blocked_by: null,
            blocking: null,
            assigned_agent_id: null,
            ...extra
        };
        tickets.push(tkt);
        return tkt;
    };

    // EPIC 1 CHAIN
    const ep1 = addTkt('Epic', null, 'AR Spectator Core', 'In Progress', -30, 150);
    let lastS = null;
    const s1 = ['Spatial Mapping', 'LiDAR Feed', 'Shader Pack', 'Pipeline V1'];
    
    s1.forEach((name, i) => {
        const s = addTkt('Story', ep1.id, name, 'In Progress', -20 + (i * 30), -20 + (i * 30) + 25, {
            blocked_by: lastS ? lastS.identifier : null
        });
        if (lastS) {
            const prev = tickets.find(t => t.id === lastS.id);
            if (prev) prev.blocking = s.identifier;
        }
        lastS = s;

        // Tasks per story
        let lastT = null;
        for (let j = 0; j < 3; j++) {
            const start = (-20 + (i * 30)) + (j * 8);
            const t = addTkt('Task', s.id, `${name} - T${j+1}`, 'In Progress', start, start + 7, {
                blocked_by: lastT ? lastT.identifier : null,
                assigned_agent_id: 'Claude-dev-1'
            });
            if (lastT) {
                const prevT = tickets.find(tk => tk.id === lastT.id);
                if (prevT) prevT.blocking = t.identifier;
            }
            lastT = t;
        }
    });

    // EPIC 2 CHAIN (Blocked by last story of EPIC 1)
    const ep2 = addTkt('Epic', null, 'Neural Coaching Engine', 'Todo', 100, 250);
    const storyEp2 = addTkt('Story', ep2.id, 'ML Model Training', 'Todo', 110, 150, {
        blocked_by: lastS.identifier 
    });
    const blockerS = tickets.find(t => t.id === lastS.id);
    if (blockerS) blockerS.blocking = storyEp2.identifier;

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
        insert.run(t);
    }
    
    console.log(`Mock data seeding complete. Created ${tickets.length} tickets with validated logical edges.`);
}

db.close();
