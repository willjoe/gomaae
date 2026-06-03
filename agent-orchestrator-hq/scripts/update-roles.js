const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/ticket-manager.db');
const db = new Database(dbPath);

const tickets = db.prepare('SELECT id, title, description FROM tickets').all();

const updateRole = db.prepare('UPDATE tickets SET llm_role = ? WHERE id = ?');

for (const t of tickets) {
    let role = 'Generalist';
    const text = ((t.title || '') + ' ' + (t.description || '')).toLowerCase();
    
    if (text.includes('architecture') || text.includes('infrastructure') || text.includes('epic') || text.includes('strategy') || text.includes('decouple') || text.includes('monolith')) {
        role = 'Technical Architect';
    } else if (text.includes('api') || text.includes('backend') || text.includes('server') || text.includes('database') || text.includes('graphql')) {
        role = 'API Engineer';
    } else if (text.includes('ui') || text.includes('frontend') || text.includes('css') || text.includes('react') || text.includes('visual') || text.includes('tailwind')) {
        role = 'Frontend Web Eng';
    } else if (text.includes('security') || text.includes('auth') || text.includes('vfs') || text.includes('compliance')) {
        role = 'Security Engineer';
    } else if (text.includes('test') || text.includes('qa') || text.includes('validation')) {
        role = 'Functional QA Eng';
    }
    
    updateRole.run(role, t.id);
    console.log(`Updated ${t.id} (${t.title}) to ${role}`);
}

console.log('Done updating roles.');
