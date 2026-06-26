// High-Integrity Tickets API
import { NextResponse } from "next/server";
import { createTicket } from "@/lib/ticketCreate";
export const dynamic = "force-dynamic";

const DATE_AUTO_TIERS = new Set(['Task', 'QA', 'UnitTest']);
const TIER_DURATION_DAYS: Record<string, number> = { Task: 3, QA: 2, UnitTest: 2 };

/**
 * Resolve authorized_model from: caller-supplied value → role's default_model on
 * the Agent Assignments page (agent_roles table) → workspace default_ai_engine.
 */
function resolveModel(db: any, supplied: string | null | undefined, roleName: string | null | undefined): string | null {
  if (supplied?.trim()) return supplied.trim();
  if (roleName?.trim()) {
    try {
      const row = db.prepare('SELECT default_model FROM agent_roles WHERE name = ?').get(roleName.trim()) as any;
      if (row?.default_model) return row.default_model;
    } catch {}
  }
  try {
    const eng = (db.prepare('SELECT value FROM project_settings WHERE key = ?').get('default_ai_engine') as any)?.value;
    if (eng && eng !== 'null' && eng !== 'undefined') return eng;
  } catch {}
  return null;
}

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

    let indexTicket = (id: string) => {};
    try {
       const ai = require('@/lib/ai/embeddings');
       indexTicket = ai.indexTicket;
    } catch(e) {}

    const body = await request.json();
    const {
      title, description, tier, parent_id, documents, status,
      document_content, document_name, document_path, document_type,
      authorized_model, llm_role, blocked_by, linked_ticket_id,
      start_datetime, due_datetime, assigned_agent_id,
    } = body;

    // Enforce parent requirements: Story needs Epic or Operation, Task needs Story, QA needs Task.
    const REQUIRED_PARENT: Record<string, string | string[]> = { Task: 'Story', QA: 'Task' };
    if (REQUIRED_PARENT[tier]) {
      if (!parent_id) {
        const expected = Array.isArray(REQUIRED_PARENT[tier])
          ? (REQUIRED_PARENT[tier] as string[]).join(' or ')
          : REQUIRED_PARENT[tier];
        return NextResponse.json({ success: false, error: `A ${tier} ticket requires a parent ${expected}.` }, { status: 400 });
      }
      const parentRow = db.prepare('SELECT tier FROM tickets WHERE id = ?').get(parent_id) as any;
      if (!parentRow) {
        return NextResponse.json({ success: false, error: `Parent ticket not found.` }, { status: 400 });
      }
      const allowedParents = Array.isArray(REQUIRED_PARENT[tier])
        ? REQUIRED_PARENT[tier] as string[]
        : [REQUIRED_PARENT[tier] as string];
      if (!allowedParents.includes(parentRow.tier)) {
        return NextResponse.json({ success: false, error: `A ${tier} ticket's parent must be a ${allowedParents.join(' or ')} (got ${parentRow.tier}).` }, { status: 400 });
      }
    }
    if (tier === 'Story') {
      if (!parent_id) {
        return NextResponse.json({ success: false, error: 'A Story ticket requires a parent Epic or Operation.' }, { status: 400 });
      }
      const parentRow = db.prepare('SELECT tier FROM tickets WHERE id = ?').get(parent_id) as any;
      if (!parentRow) {
        return NextResponse.json({ success: false, error: 'Parent ticket not found.' }, { status: 400 });
      }
      if (parentRow.tier !== 'Epic' && parentRow.tier !== 'Operation') {
        return NextResponse.json({ success: false, error: `A Story ticket's parent must be an Epic or Operation (got ${parentRow.tier}).` }, { status: 400 });
      }
    }

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
        if (!resolvedPath) {
            const slug2 = (str: string) => str.trim().replace(/ /g, '_').replace(/[\[\]]/g, '');
            resolvedPath = `/Global/Misc/${slug2(title)}`;
        }
    }

    // Resolve authorized_model from role's Agent Assignment config or workspace default.
    const resolvedModel = resolveModel(db, authorized_model, llm_role);

    // Auto-assign start/due for agent-executed tiers if the caller didn't supply them.
    let resolvedStart = start_datetime || null;
    let resolvedDue = due_datetime || null;
    if (DATE_AUTO_TIERS.has(tier) && (!resolvedStart || !resolvedDue)) {
      const { nextMonday, dueDatetime } = require('@/lib/epicDates');
      if (!resolvedStart) resolvedStart = nextMonday();
      if (!resolvedDue) resolvedDue = dueDatetime(resolvedStart, TIER_DURATION_DAYS[tier] ?? 3);
    }

    // createTicket validates required fields and inserts — throws on any violation.
    let id: string;
    let identifier: string;
    try {
      ({ id, identifier } = createTicket(db, {
        title, description, tier, status,
        parent_id, start_datetime: resolvedStart, due_datetime: resolvedDue,
        llm_role, authorized_model: resolvedModel, blocked_by, linked_ticket_id,
        document_content, document_name,
        document_path: resolvedPath,
        document_type,
        assigned_agent_id,
      }));
    } catch (validationError: any) {
      return NextResponse.json({ success: false, error: validationError.message }, { status: 400 });
    }

    if (documents && Array.isArray(documents)) {
        for (const doc of documents) {
            const docId = `doc-${Math.random().toString(36).substr(2, 9)}`;
            const docIdent = `DOC-${1000 + Math.floor(Math.random()*9000)}`;
            db.prepare('INSERT INTO tickets (id, identifier, title, description, status, tier, parent_id, document_name, document_type, document_content) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .run(docId, docIdent, doc.title, (doc.content || '').substring(0, 100)+'...', 'Finalized', 'Document', id, doc.name, 'markdown', doc.content);
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
    const { db, getActiveProjectId } = require('@/lib/db');
    const { spawnAgentWorker } = require('@/lib/ai/orchestrator');
    const projectId = getActiveProjectId();

    const body = await request.json();
    const { ticketId, status } = body;

    if (!ticketId) {
      return NextResponse.json({ success: false, error: 'ticketId is required.' }, { status: 400 });
    }

    const allowedKeys = [
      'status', 'agent_state', 'agent_phase', 'assigned_agent_id',
      'approx_runtime_minutes', 'expected_token_usage', 'actual_token_usage',
      'blocked_by', 'description', 'title', 'linked_ticket_id', 'execution_flag',
      'git_branch', 'start_datetime', 'due_datetime', 'authorized_model',
    ];
    const fieldsToUpdate: string[] = [];
    const params: any[] = [];

    for (const key of allowedKeys) {
      if (key in body) {
        fieldsToUpdate.push(`${key} = ?`);
        params.push(body[key]);
      }
    }

    if (fieldsToUpdate.length > 0) {
      fieldsToUpdate.push('updated_at = CURRENT_TIMESTAMP');
      params.push(ticketId);
      db.prepare(`UPDATE tickets SET ${fieldsToUpdate.join(', ')} WHERE id = ?`).run(...params);
    }

    if (status === 'In Progress') {
      db.prepare("UPDATE tickets SET in_progress_at = CURRENT_TIMESTAMP WHERE id = ? AND in_progress_at IS NULL").run(ticketId);
    }
    if (status === 'In Review') {
      db.prepare("UPDATE tickets SET in_review_at = CURRENT_TIMESTAMP WHERE id = ? AND in_review_at IS NULL").run(ticketId);
    }

    if (status === 'In Progress') {
      try {
        const { BRANCH_OWNING_TIERS } = require('@/lib/branchRules');
        const { createBranchForTicket } = require('@/lib/branchOps');
        const ticketRow = db.prepare('SELECT tier, git_branch FROM tickets WHERE id = ?').get(ticketId) as any;
        if (ticketRow && BRANCH_OWNING_TIERS.has(ticketRow.tier) && !ticketRow.git_branch) {
          createBranchForTicket(ticketId);
        }
      } catch (e: any) {
        console.warn('[PATCH] Branch creation failed (non-fatal):', e.message);
      }
    }

    if (status === 'Todo' && projectId) {
      const autoTrigger = db.prepare('SELECT value FROM project_settings WHERE key = ?').get('auto_trigger_enabled')?.value;
      if (autoTrigger === 'true') {
         spawnAgentWorker(ticketId).catch((e: any) => console.error('[Orchestrator] Spawn Error:', e));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Tickets PATCH] Critical Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Hard-deletes a ticket and all its descendants.
 * Only tickets in Backlog or To Do status may be deleted.
 */
export async function DELETE(request: Request) {
  try {
    const { db, getActiveProjectId } = require('@/lib/db');
    if (!getActiveProjectId()) {
      return NextResponse.json({ success: false, error: 'No active project' }, { status: 400 });
    }

    const body = await request.json();
    const { ticketId } = body;
    if (!ticketId) {
      return NextResponse.json({ success: false, error: 'ticketId is required' }, { status: 400 });
    }

    const ticket = db.prepare('SELECT status, title FROM tickets WHERE id = ?').get(ticketId) as any;
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
    }

    const DELETABLE = new Set(['Backlog', 'To Do', 'Draft']);
    if (!DELETABLE.has(ticket.status)) {
      return NextResponse.json({
        success: false,
        error: `Cannot delete "${ticket.title}" — only Backlog and To Do tickets can be deleted (current status: ${ticket.status}).`,
      }, { status: 400 });
    }

    // Collect the full descendant tree depth-first.
    function collectTree(id: string): string[] {
      const children = db.prepare('SELECT id FROM tickets WHERE parent_id = ?').all(id) as any[];
      return [id, ...children.flatMap((c: any) => collectTree(c.id))];
    }

    const toDelete = collectTree(ticketId);
    // Delete leaves first so FK constraints (if ever added) are safe.
    for (const id of [...toDelete].reverse()) {
      db.prepare('DELETE FROM tickets WHERE id = ?').run(id);
    }

    return NextResponse.json({ success: true, deleted: toDelete.length });
  } catch (error: any) {
    console.error('[API Tickets DELETE] Critical Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
