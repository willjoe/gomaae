import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { generateText } from '@/lib/ai/llm';
import { parseJsonLoose } from '@/lib/brainstorm';
import { sanitizeRole } from '@/lib/agentRoles';

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
 * Every generated child must have a non-empty title AND description — any that
 * are blank are discarded before the DB insert.
 *
 * The full ancestor chain (title + description + attached documents) is included in
 * the prompt so the LLM generates tickets grounded in the complete project context.
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
Each Task must be a single, time-bounded implementation unit (code, config, or test setup) that is grounded in the project context and any attached design documents.
Every field is REQUIRED — no item may be blank.

Return ONLY a JSON array (no prose, no markdown fences):
[
  {
    "title": "Specific technical action, max 10 words",
    "description": "2-3 sentences: what to implement, the approach, and the definition of done.",
    "status": "Backlog"
  }
]`;

    const raw = await generateText(prompt);
    const items: { title: string; description: string; status?: string }[] = parseJsonLoose(raw);

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'LLM did not return a valid ticket list.' }, { status: 500 });
    }

    const { nextMonday } = require('@/lib/epicDates');
    const { scheduleEpicTree } = require('@/lib/epicDates');

    const countBase = (db.prepare('SELECT count(*) as c FROM tickets').get() as any)?.c || 0;
    const PREFIX: Record<string, string> = { Epic: 'EPC', QA: 'QA', UnitTest: 'UT', Triage: 'BUG' };
    const created: { id: string; identifier: string; title: string; description: string }[] = [];

    let offset = 0;
    for (const item of items) {
      const title = (item.title || '').trim();
      const description = (item.description || '').trim();
      if (!title || !description) continue; // skip blank items

      const id = `tkt-${Math.random().toString(36).substr(2, 9)}`;
      const identifier = `${PREFIX[childTier] || 'TKT'}-${1000 + countBase + offset}`;
      offset++;

      const isTask = childTier === 'Task';
      db.prepare(`
        INSERT INTO tickets (id, identifier, title, description, status, tier, parent_id, start_date, llm_role, expected_token_usage)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        identifier,
        title,
        description,
        item.status || 'Backlog',
        childTier,
        parent.id,
        childTier === 'Story' ? nextMonday() : null,
        isTask ? 'Frontend Web Engineer' : null,
        isTask ? 100000 : null
      );

      created.push({ id, identifier, title, description });
    }

    if (created.length === 0) {
      return NextResponse.json({ success: false, error: 'All generated items had blank fields and were discarded.' }, { status: 500 });
    }

    // Reschedule the epic waterfall after bulk child creation.
    try {
      const epicId = childTier === 'Story' ? parent.id : (() => {
        const story = db.prepare('SELECT parent_id FROM tickets WHERE id = ?').get(parent.id) as any;
        return story?.parent_id;
      })();
      if (epicId) scheduleEpicTree(epicId);
    } catch { /* non-fatal */ }

    return NextResponse.json({ success: true, created, childTier });
  } catch (error: any) {
    console.error('[API Tickets GenerateChildren] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
