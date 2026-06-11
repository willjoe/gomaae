// High-Integrity Tickets API
import { NextResponse } from "next/server";
import { sanitizeRole } from '@/lib/agentRoles';
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db, getActiveProjectId } = require('@/lib/db');
    const projectId = getActiveProjectId();
    
    if (!projectId) return NextResponse.json({ tickets: [] });

    const tickets = db.prepare('SELECT * FROM tickets ORDER BY updated_at DESC').all();
    return NextResponse.json({ tickets });
  } catch (error: any) {
    console.error('[API Tickets GET] Critical Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { db, getActiveProjectId } = require('@/lib/db');
    const projectId = getActiveProjectId();

    if (!projectId) {
       return NextResponse.json({ success: false, error: 'No active project' }, { status: 400 });
    }

    // Lazy load embedding indexer if available
    let indexTicket = (id: string) => {};
    try {
       const ai = require('@/lib/ai/embeddings');
       indexTicket = ai.indexTicket;
    } catch(e) {}

    const body = await request.json();
    const { title, description, tier, parent_id, documents, status, document_content, document_name, document_path, authorized_model, llm_role, blocked_by, linked_ticket_id } = body;
    
    const id = `tkt-${Math.random().toString(36).substr(2, 9)}`;
    const countRes = db.prepare("SELECT count(*) as c FROM tickets").get();
    const PREFIX: Record<string, string> = { Epic: 'EPC', QA: 'QA', UnitTest: 'UT', Triage: 'BUG' };
    const identifier = `${PREFIX[tier] || 'TKT'}-${1000 + (countRes?.c || 0)}`;

    // Strict OO-DDD Path Logic
    let resolvedPath = document_path;
    if (!resolvedPath && document_content) {
        const slug = (str: string) => str.trim().replace(/ /g, '_').replace(/[\[\]]/g, '');
        
        if (tier === 'Epic') {
            if (title.includes('Strategy') || title.includes('Brief')) {
                resolvedPath = `/Global/Briefs/${slug(title)}`;
            } else if (title.includes('Guardrail')) {
                resolvedPath = `/Global/Guardrails/${slug(title)}`;
            } else if (title.includes('Architecture') || title.includes('Design')) {
                resolvedPath = `/Global/Architecture_Design/${slug(title)}`;
            } else {
                // Root Domain Specification
                resolvedPath = `/Domains/${slug(title)}/[Specification] ${title}`;
            }
        } else if (tier === 'Story' && parent_id) {
            const parent = db.prepare('SELECT title, tier, parent_id FROM tickets WHERE id = ?').get(parent_id);
            if (parent) {
                const parentSlug = slug(parent.title);
                resolvedPath = `/Domains/${parentSlug}/Features/${slug(title)}/[TDD] ${title}`;
            }
        } else if (tier === 'QA' && parent_id) {
            const parent = db.prepare('SELECT title, tier, parent_id FROM tickets WHERE id = ?').get(parent_id);
            if (parent && parent.tier === 'Story') {
                const grandParent = parent.parent_id ? db.prepare('SELECT title FROM tickets WHERE id = ?').get(parent.parent_id) : null;
                const domainSlug = grandParent ? slug(grandParent.title) : 'Unknown_Domain';
                resolvedPath = `/Domains/${domainSlug}/Features/${slug(parent.title)}/[QA] ${title}`;
            }
        }

        // Fallback for manual or edge cases
        if (!resolvedPath) {
            resolvedPath = `/Global/Misc/${identifier}_${slug(title)}`;
        }
    }
    
    db.prepare(`
        INSERT INTO tickets (
            id, identifier, title, description, status, tier, parent_id,
            document_content, document_name, document_path, authorized_model, llm_role,
            blocked_by, linked_ticket_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        id, identifier, title, description,
        status || 'Backlog', tier || 'Epic', parent_id || null,
        document_content || null, document_name || null, resolvedPath || null, authorized_model || null, sanitizeRole(llm_role, tier || 'Epic'),
        blocked_by || null, linked_ticket_id || null
    );
      
    if (documents && Array.isArray(documents)) {
        for (const doc of documents) {
            const docId = `doc-${Math.random().toString(36).substr(2, 9)}`;
            const docIdent = `DOC-${1000 + Math.floor(Math.random()*9000)}`;
            db.prepare('INSERT INTO tickets (id, identifier, title, description, status, tier, parent_id, document_name, document_type, document_content, document_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .run(docId, docIdent, doc.title, (doc.content || '').substring(0, 100)+'...', 'Finalized', 'Document', id, doc.name, 'markdown', doc.content, doc.path || null);
            
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

    const { ticketId, status, agent_state, llm_role, authorized_model, blocked_by } = await request.json();

    // 1. Persist State Change (partial: status, agent_state, assignment, dependencies).
    const sets: string[] = [];
    const vals: any[] = [];
    if (status !== undefined) { sets.push('status = ?'); vals.push(status); }
    if (agent_state !== undefined) { sets.push('agent_state = ?'); vals.push(agent_state); }
    if (llm_role !== undefined) {
      // Only accept a role that exists in Agent Roles for this ticket's level; else null.
      const tierRow = db.prepare('SELECT tier FROM tickets WHERE id = ?').get(ticketId) as any;
      sets.push('llm_role = ?'); vals.push(sanitizeRole(llm_role, tierRow?.tier));
    }
    if (authorized_model !== undefined) { sets.push('authorized_model = ?'); vals.push(authorized_model); }
    if (blocked_by !== undefined) { sets.push('blocked_by = ?'); vals.push(blocked_by); }
    if (sets.length) {
      sets.push('updated_at = CURRENT_TIMESTAMP');
      db.prepare(`UPDATE tickets SET ${sets.join(', ')} WHERE id = ?`).run(...vals, ticketId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Tickets PATCH] Critical Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
