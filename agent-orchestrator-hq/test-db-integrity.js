const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'ticket-manager.db');
console.log('Testing DB at:', dbPath);

try {
    const db = new Database(dbPath);
    
    // 1. Check extension
    try {
        const sqliteVec = require('sqlite-vec');
        sqliteVec.load(db);
        console.log('SUCCESS: sqlite-vec loaded');
    } catch (e) {
        console.error('FAIL: sqlite-vec failed to load:', e.message);
    }

    // 2. Check table info
    const info = db.prepare("PRAGMA table_info(tickets)").all();
    console.log('Columns in tickets table:', info.map(c => c.name).join(', '));

    // 3. Check virtual table
    try {
        const vecInfo = db.prepare("SELECT count(*) as count FROM vec_tickets").get();
        console.log('SUCCESS: vec_tickets virtual table accessible. Count:', vecInfo.count);
    } catch (e) {
        console.error('FAIL: vec_tickets inaccessible:', e.message);
    }

    // 4. Try a sample select
    try {
        const sample = db.prepare("SELECT id, identifier, title FROM tickets LIMIT 1").get();
        console.log('SUCCESS: Sample ticket fetch:', sample ? sample.identifier : 'Empty table');
    } catch (e) {
        console.error('FAIL: Query failed:', e.message);
    }

    db.close();
} catch (err) {
    console.error('FATAL DB ERROR:', err.message);
}
