// High-Integrity Tickets API
import { NextResponse } from "next/server";
export const dynamic = "force-static";

export async function GET() {
  try {
    const { db } = require('@/lib/db');
    const tickets = db.prepare('SELECT * FROM tickets ORDER BY updated_at DESC').all();
    return NextResponse.json({ tickets });
  } catch (error: any) {
    console.error('[API Tickets GET] Critical Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { db } = require('@/lib/db');
    // Lazy load embedding indexer if available
    let indexTicket = (id: string) => {};
    try {
       const ai = require('@/lib/ai/embeddings');
       indexTicket = ai.indexTicket;
    } catch(e) {}

    const body = await request.json();
    const { title, description, tier, parent_id, documents } = body;
    
    const id = `tkt-${Math.random().toString(36).substr(2, 9)}`;
    const countRes = db.prepare("SELECT count(*) as c FROM tickets").get();
    const identifier = `HIAD-${1000 + (countRes?.c || 0)}`;
    
    db.prepare('INSERT INTO tickets (id, identifier, title, description, status, tier, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, identifier, title, description, 'Draft', tier || 'Epic', parent_id || null);
      
    if (documents && Array.isArray(documents)) {
        for (const doc of documents) {
            const docId = `doc-${Math.random().toString(36).substr(2, 9)}`;
            const docIdent = `DOC-${1000 + Math.floor(Math.random()*9000)}`;
            db.prepare('INSERT INTO tickets (id, identifier, title, description, status, tier, parent_id, document_name, document_type, document_content) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .run(docId, docIdent, doc.title, doc.content.substring(0, 100)+'...', 'Finalized', 'Document', id, doc.name, 'markdown', doc.content);
            
            try { await indexTicket(docId); } catch(e) {}
        }
    }
    
    try { await indexTicket(id); } catch(e) {}
    
    return NextResponse.json({ success: true, id, identifier });
  } catch (error: any) {
    console.error('[API Tickets POST] Critical Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Updates ticket status and triggers autonomous workers if applicable.
 */
export async function PATCH(request: Request) {
  try {
    const { db } = require('@/lib/db');
    const { spawnAgentWorker } = require('@/lib/ai/orchestrator');
    
    const { ticketId, status } = await request.json();

    // 1. Persist State Change
    db.prepare('UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, ticketId);
    
    // 2. Evaluate Automation Trigger
    if (status === 'Todo') {
      const autoTrigger = db.prepare('SELECT value FROM settings WHERE key = ?').get('auto_trigger_enabled')?.value;
      
      if (autoTrigger === 'true') {
         // Asynchronous spawn
         spawnAgentWorker(ticketId).catch((e: any) => console.error('[Orchestrator] Spawn Error:', e));
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Tickets PATCH] Critical Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
