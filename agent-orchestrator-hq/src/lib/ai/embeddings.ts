import { db } from '../db';

/**
 * Generates an embedding for a piece of text using local Ollama.
 * Optimized for jina-embeddings-v3 with 256 dimensions.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    
    try {
        const response = await fetch(`${ollamaHost}/api/embeddings`, {
            method: 'POST',
            body: JSON.stringify({
                model: 'jina-v3', // User recommended
                prompt: `Represent this technical requirement for high-integrity retrieval: ${text}`
            }),
        });

        const json = await response.json();
        // Matryoshka truncation: Jina-v3 supports taking the first N dimensions
        return json.embedding.slice(0, 256);
    } catch (error) {
        console.error('Failed to generate embedding:', error);
        return null;
    }
}

/**
 * Updates a ticket with its vector representation.
 */
export async function indexTicket(ticketId: string) {
    const ticket = db.prepare('SELECT title, description, document_content FROM tickets WHERE id = ?').get(ticketId) as any;
    if (!ticket) return;

    const content = `${ticket.title} ${ticket.description} ${ticket.document_content || ''}`;
    const vector = await generateEmbedding(content);

    if (vector) {
        const buffer = Buffer.from(new Float32Array(vector).buffer);
        
        const update = db.transaction(() => {
            db.prepare('UPDATE tickets SET vector_embedding = ? WHERE id = ?').run(buffer, ticketId);
            db.prepare('INSERT OR REPLACE INTO vec_tickets(ticket_id, embedding) VALUES (?, ?)').run(ticketId, buffer);
        });
        
        update();
        console.log(`[RAG] Indexed ticket: ${ticketId}`);
    }
}

/**
 * Performs semantic search across the ticket registry.
 */
export async function semanticSearch(query: string, limit = 5) {
    const vector = await generateEmbedding(query);
    if (!vector) return [];

    const buffer = Buffer.from(new Float32Array(vector).buffer);
    
    return db.prepare(`
        SELECT 
            t.*,
            vec_distance_l2(vt.embedding, ?) as distance
        FROM vec_tickets vt
        JOIN tickets t ON t.id = vt.ticket_id
        ORDER BY distance ASC
        LIMIT ?
    `).all(buffer, limit);
}
