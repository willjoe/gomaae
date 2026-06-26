import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { generateText } from '@/lib/ai/llm';
import { parseJsonLoose } from '@/lib/brainstorm';
import { getAgentRoles } from '@/lib/agentRoles';

const CHILD_TIER: Record<string, string> = { Epic: 'Story', Story: 'Task', Operation: 'Story' };

/** Walk up the ancestor chain from ticketId (inclusive) and build a context block. */
function buildAncestorContext(db: any, ticketId: string): string {
  const ancestors: any[] = [];
  let currentId: string | null = ticketId;
  const visited = new Set<string>();
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const row = db.prepare(
      'SELECT id, parent_id, tier, identifier, title, description, document_content FROM tickets WHERE id = ?'
    ).get(currentId) as any;
    if (!row) break;
    ancestors.unshift(row);
    currentId = row.parent_id ?? null;
  }
  return ancestors.map((a) => {
    const lines = [`[${a.tier}] ${a.identifier}: ${a.title}`];
    if (a.description?.trim()) lines.push(`Description: ${a.description.trim()}`);
    if (a.document_content?.trim()) lines.push(`Attached document:\n${String(a.document_content).trim().slice(0, 2000)}`);
    return lines.join('\n');
  }).join('\n\n---\n\n');
}

/**
 * Given a parent ticket (Epic, Operation, or Story), use the LLM to generate a set of
 * fully-specified child tickets (Stories or Tasks respectively), then persist them.
 *
 * For Task children: also generates a paired QA ticket for each task.
 * Every generated child must have a non-empty title AND description — any that
 * are blank are discarded before the DB insert.
 */
export async function POST(request: Request) {
  try {
    const { db, getActiveProjectId } = require('@/lib/db');
    const projectId = getActiveProjectId();
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'No active workstation.' }, { status: 400 });
    }

    const { parentTicketId } = await request.json();
    if (!parentTicketId) {
      return NextResponse.json({ success: false, error: 'parentTicketId is required.' }, { status: 400 });
    }

    const parent = db.prepare('SELECT * FROM tickets WHERE id = ?').get(parentTicketId) as any;
    if (!parent) {
      return NextResponse.json({ success: false, error: 'Parent ticket not found.' }, { status: 404 });
    }

    const childTier = CHILD_TIER[parent.tier];
    if (!childTier) {
      return NextResponse.json({ success: false, error: `Cannot generate children for a ${parent.tier} ticket.` }, { status: 400 });
    }

    const isStoryGen = childTier === 'Story';
    const ancestorContext = buildAncestorContext(db, parent.id);
    const contextBlock = ancestorContext
      ? `\nFull project context (ancestor chain, root first):\n\n${ancestorContext}\n`
      : '';

    // Active roles for the relevant lifecycle.
    const taskRoles = getAgentRoles({ activeOnly: true, lifecycle: 'development' });
    const taskRoleList = taskRoles.map((r) => r.name).join(' | ');

    const prompt = isStoryGen
      ? `You are a senior product manager breaking down an Epic into user-facing Stories.
${contextBlock}
Immediate parent — ${parent.tier}: "${parent.title}"
Description: "${parent.description || ''}"

Using the full context above, generate 4 to 6 Story tickets that together deliver this Epic.
Each Story must represent a single, shippable user-facing feature that is consistent with the project context and any attached documents.
Every field is REQUIRED — no item may be blank.

Return ONLY a JSON array (no prose, no markdown fences):
[
  {
    "title": "Feature name — action verb + noun phrase, max 10 words",
    "description": "2-4 sentences: what the user can do, acceptance criteria, and the value it delivers.",
    "status": "Backlog"
  }
]`
      : `You are a senior engineer breaking down a Story into concrete implementation Tasks.
${contextBlock}
Immediate parent — Story: "${parent.title}"
Description: "${parent.description || ''}"

Using the full context above, generate 4 to 7 Task tickets that together implement this Story.
Each Task must be a single, time-bounded implementation unit (code, config, or test setup) grounded in the project context.
Every field is REQUIRED — no item may be blank.

Available agent roles: ${taskRoleList}

Return ONLY a JSON array (no prose, no markdown fences):
[
  {
    "title": "Specific technical action, max 10 words",
    "description": "2-3 sentences: what to implement, the approach, and the definition of done.",
    "status": "Backlog",
    "llm_role": "exact role name from the available list above"
  }
]`;

    const raw = await generateText(prompt);
    const items: { title: string; description: string; status?: string; llm_role?: string }[] = parseJsonLoose(raw);

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'LLM did not return a valid ticket list.' }, { status: 500 });
    }

    const { nextMonday } = require('@/lib/epicDates');
    const { scheduleEpicTree } = require('@/lib/epicDates');

    const PREFIX: Record<string, string> = { Epic: 'EPC', QA: 'QA', UnitTest: 'UT', Triage: 'BUG' };
    const countBase = () => (db.prepare('SELECT count(*) as c FROM tickets').get() as any)?.c || 0;

    const created: { id: string; identifier: string; title: string; description: string }[] = [];
    const createdTasks: { id: string; identifier: string; title: string }[] = [];

    for (const item of items) {
      const title = (item.title || '').trim();
      const description = (item.description || '').trim();
      if (!title || !description) continue;

      const id = `tkt-${Math.random().toString(36).substr(2, 9)}`;
      const identifier = `${PREFIX[childTier] || 'TKT'}-${1000 + countBase()}`;

      // Validate suggested role against known active roles.
      const suggestedRole = item.llm_role?.trim() ?? null;
      const validRole = suggestedRole && taskRoles.some((r) => r.name === suggestedRole)
        ? suggestedRole
        : childTier === 'Task' ? 'Frontend Web Engineer' : null;

      // Look up authorized_model for the role (best-effort).
      let authorized_model: string | null = null;
      if (validRole) {
        try {
          const roleRow = db.prepare('SELECT default_model FROM agent_roles WHERE name = ?').get(validRole) as any;
          if (roleRow?.default_model) authorized_model = roleRow.default_model;
        } catch {}
      }

      db.prepare(`
        INSERT INTO tickets (id, identifier, title, description, status, tier, parent_id, start_date, llm_role, authorized_model, expected_token_usage)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        identifier,
        title,
        description,
        item.status || 'Backlog',
        childTier,
        parent.id,
        childTier === 'Story' ? nextMonday() : null,
        validRole,
        authorized_model,
        childTier === 'Task' ? 100000 : null,
      );

      created.push({ id, identifier, title, description });
      if (childTier === 'Task') createdTasks.push({ id, identifier, title });
    }

    if (created.length === 0) {
      return NextResponse.json({ success: false, error: 'All generated items had blank fields and were discarded.' }, { status: 500 });
    }

    // For Task generation: create a paired QA ticket for each task.
    const createdQA: { id: string; identifier: string; taskIdentifier: string }[] = [];
    if (childTier === 'Task') {
      for (const task of createdTasks) {
        const qaId = `tkt-${Math.random().toString(36).substr(2, 9)}`;
        const qaIdentifier = `QA-${1000 + countBase()}`;

        let qaModel: string | null = null;
        try {
          const roleRow = db.prepare("SELECT default_model FROM agent_roles WHERE name = 'Functional QA Engineer'").get() as any;
          if (roleRow?.default_model) qaModel = roleRow.default_model;
        } catch {}

        db.prepare(`
          INSERT INTO tickets (id, identifier, title, description, status, tier, parent_id, llm_role, authorized_model, linked_ticket_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          qaId,
          qaIdentifier,
          `QA: Verify ${task.identifier} — ${task.title.slice(0, 50)}`,
          `Verify the implementation of ${task.title}.\n\nConfirm the definition of done is met for ${task.identifier}.\n\nUpload evidence (screenshots, test output) before approving the merge.`,
          'Backlog',
          'QA',
          task.id,
          'Functional QA Engineer',
          qaModel,
          task.identifier,
        );

        createdQA.push({ id: qaId, identifier: qaIdentifier, taskIdentifier: task.identifier });
      }
    }

    // Reschedule the epic waterfall after bulk child creation.
    try {
      const epicId = childTier === 'Story' ? parent.id : (() => {
        const story = db.prepare('SELECT parent_id FROM tickets WHERE id = ?').get(parent.id) as any;
        return story?.parent_id;
      })();
      if (epicId) scheduleEpicTree(epicId);
    } catch { /* non-fatal */ }

    return NextResponse.json({ success: true, created, createdQA, childTier });
  } catch (error: any) {
    console.error('[API Tickets GenerateChildren] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
