const Database = require('better-sqlite3');
const path = require('path');
const sqliteVec = require('sqlite-vec');

const dbPath = path.join(__dirname, '../data', 'ticket-manager.db');
const db = new Database(dbPath);
sqliteVec.load(db);

async function run() {
    console.log("[RAG] Starting batch embedding worker...");
    
    const tickets = db.prepare('SELECT id, title, description, document_content FROM tickets WHERE vector_embedding IS NULL').all();
    console.log(`[RAG] Found ${tickets.length} tickets to index.`);

    for (const ticket of tickets) {
        try {
            const content = `${ticket.title} ${ticket.description} ${ticket.document_content || ''}`;
            
            const response = await fetch('http://localhost:11434/api/embeddings', {
                method: 'POST',
                body: JSON.stringify({
                    model: 'jina-v3',
                    prompt: `Represent this technical requirement for high-integrity retrieval: ${content}`
                }),
            });

            const json = await response.json();
            const vector = json.embedding.slice(0, 256);
            const buffer = Buffer.from(new Float32Array(vector).buffer);

            const update = db.transaction(() => {
                db.prepare('UPDATE tickets SET vector_embedding = ? WHERE id = ?').run(buffer, ticket.id);
                db.prepare('INSERT OR REPLACE INTO vec_tickets(ticket_id, embedding) VALUES (?, ?)').run(ticket.id, buffer);
            });
            update();
            
            console.log(`[RAG] Indexed: ${ticket.title}`);
        } catch (err) {
            console.error(`[RAG] Failed to index ${ticket.id}:`, err.message);
        }
    }

    console.log("[RAG] Worker finished.");
    db.close();
}

run();
