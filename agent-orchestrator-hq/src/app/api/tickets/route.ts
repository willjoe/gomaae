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
    const { title, description, tier, parent_id, documents, status, document_content, document_name, document_path, authorized_model, llm_role, blocked_by, linked_ticket_id, start_date, due_date } = body;

    // Epics default to starting next Monday; their Target Delivery is derived from
    // their stories (recalculated below whenever a story is created/changed).
    const { nextMonday, recalcEpicTargetDelivery } = require('@/lib/epicDates');
    const resolvedStart = start_date || (tier === 'Epic' ? nextMonday() : null);

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
            // Story = the WHAT (one product feature) — its document is the PRD.
            const parent = db.prepare('SELECT title, tier, parent_id FROM tickets WHERE id = ?').get(parent_id);
            if (parent) {
                const parentSlug = slug(parent.title);
                resolvedPath = `/Domains/${parentSlug}/Features/${slug(title)}/[PRD] ${title}`;
            }
        } else if (tier === 'Task' && parent_id) {
            // Task = the HOW — its document is the TDD, filed under the parent Story's feature folder.
            const parent = db.prepare('SELECT title, tier, parent_id FROM tickets WHERE id = ?').get(parent_id);
            if (parent && parent.tier === 'Story') {
                const grandParent = parent.parent_id ? db.prepare('SELECT title FROM tickets WHERE id = ?').get(parent.parent_id) : null;
                const domainSlug = grandParent ? slug(grandParent.title) : 'Unknown_Domain';
                resolvedPath = `/Domains/${domainSlug}/Features/${slug(parent.title)}/[TDD] ${title}`;
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
            blocked_by, linked_ticket_id, start_date, due_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        id, identifier, title, description,
        status || 'Backlog', tier || 'Epic', parent_id || null,
        document_content || null, document_name || null, resolvedPath || null, authorized_model || null, sanitizeRole(llm_role, tier || 'Epic'),
        blocked_by || null, linked_ticket_id || null, resolvedStart, due_date || null
    );

    // A new story or task re-runs the epic's default waterfall scheduling: tasks
    // chain day-after-due inside their story, stories chain under the epic from
    // its start date, and the epic's Target Delivery follows the last story.
    try {
        const { scheduleEpicTree } = require('@/lib/epicDates');
        if (tier === 'Story' && parent_id) {
            scheduleEpicTree(parent_id);
        } else if (tier === 'Task' && parent_id) {
            const story = db.prepare('SELECT parent_id, tier FROM tickets WHERE id = ?').get(parent_id);
            if (story?.tier === 'Story' && story.parent_id) scheduleEpicTree(story.parent_id);
        }
    } catch (e) { console.error('[API Tickets POST] Epic schedule failed:', e); }
      
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

    // Two-phase blocking enforcement: validate status transitions against the ticket's
    // current blocking phase before allowing the update.
    if (status !== undefined) {
      const { getBlockingPhase, isStatusAllowedByPhase } = require('@/lib/blocking');
      const allTickets = db.prepare('SELECT identifier, status, blocked_by FROM tickets').all();
      const target = db.prepare('SELECT identifier, status, blocked_by FROM tickets WHERE id = ?').get(ticketId);
      if (target) {
        const phase = getBlockingPhase(target, allTickets);
        if (!isStatusAllowedByPhase(status, phase)) {
          const phaseLabel = phase === 'blocked' ? 'blocker has not reached In Review' : 'blocker is In Review — cannot exceed In Progress yet';
          return NextResponse.json(
            { success: false, error: `Status "${status}" blocked: ${phaseLabel}.` },
            { status: 422 }
          );
        }
      }
    }

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

      // Any change to a story refreshes its epic's Target Delivery.
      const row = db.prepare('SELECT tier, parent_id FROM tickets WHERE id = ?').get(ticketId) as any;
      if (row?.tier === 'Story' && row.parent_id) {
        try { require('@/lib/epicDates').recalcEpicTargetDelivery(row.parent_id); } catch (e) { console.error('[API Tickets PATCH] Epic date recalc failed:', e); }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Tickets PATCH] Critical Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
