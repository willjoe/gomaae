import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { generateText } from '@/lib/ai/llm';
import { parseJsonLoose } from '@/lib/brainstorm';
import { getAgentRoles } from '@/lib/agentRoles';
import { nextMonday, dueDatetime, nextDayAt9 } from '@/lib/epicDates';
import { createTicket } from '@/lib/ticketCreate';

const CHILD_TIER: Record<string, string> = { Epic: 'Story', Story: 'Task', Operation: 'Story' };

const STORY_DURATION_DAYS = 14;
const TASK_DURATION_DAYS  = 3;
const QA_DURATION_DAYS    = 2;

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
 * fully-specified child tickets (Stories or Tasks respectively), then persist them via
 * createTicket so all field-validation rules are enforced in one place.
 *
 * For Task children: also generates a paired QA ticket for each task.
 * Sequential blocked_by dependencies are auto-filled for all child tiers.
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

    const { scheduleEpicTree } = require('@/lib/epicDates');

    // Workspace default model: fallback when a role has no default_model set.
    let workspaceDefaultModel: string | null = null;
    try {
      const eng = (db.prepare('SELECT value FROM project_settings WHERE key = ?').get('default_ai_engine') as any)?.value;
      if (eng && eng !== 'null' && eng !== 'undefined') workspaceDefaultModel = eng;
    } catch { /* non-fatal */ }

    // Default role for Story children (Stories need a role for scoring purposes).
    const defaultStoryRole = taskRoles[0]?.name || 'Frontend Web Engineer';

    // Preliminary start datetime for the first task in the sequence.
    const sequenceStart = parent.start_datetime || nextMonday();

    const created: { id: string; identifier: string; title: string; description: string }[] = [];
    const createdTasks: { id: string; identifier: string; title: string }[] = [];

    // Track sequential dates for Task generation.
    let taskSequenceStart = sequenceStart;
    // Track previous sibling identifier for blocked_by chaining.
    let prevIdentifier: string | null = null;

    for (const item of items) {
      const title = (item.title || '').trim();
      const description = (item.description || '').trim();
      if (!title || !description) continue;

      // ── Story child ──────────────────────────────────────────────────────
      if (isStoryGen) {
        const start_datetime = nextMonday();
        const due_datetime   = dueDatetime(start_datetime, STORY_DURATION_DAYS);
        let storyModel: string | null = null;
        try {
          const roleRow = db.prepare('SELECT default_model FROM agent_roles WHERE name = ?').get(defaultStoryRole) as any;
          storyModel = roleRow?.default_model ?? null;
        } catch {}
        storyModel = storyModel || workspaceDefaultModel;
        let result: { id: string; identifier: string };
        try {
          result = createTicket(db, {
            title, description,
            tier: 'Story',
            status: item.status || 'Backlog',
            parent_id: parent.id,
            start_datetime,
            due_datetime,
            blocked_by: prevIdentifier,
            llm_role: defaultStoryRole,
            authorized_model: storyModel,
          });
        } catch (e: any) {
          console.warn('[generate-children] Story skipped:', e.message);
          continue;
        }
        prevIdentifier = result.identifier;
        created.push({ id: result.id, identifier: result.identifier, title, description });
        continue;
      }

      // ── Task child ───────────────────────────────────────────────────────
      const suggestedRole = item.llm_role?.trim() ?? null;
      const validRole = suggestedRole && taskRoles.some((r) => r.name === suggestedRole)
        ? suggestedRole
        : 'Frontend Web Engineer';

      let authorized_model: string | null = null;
      try {
        const roleRow = db.prepare('SELECT default_model FROM agent_roles WHERE name = ?').get(validRole) as any;
        if (roleRow?.default_model) authorized_model = roleRow.default_model;
      } catch {}
      authorized_model = authorized_model || workspaceDefaultModel;

      const start_datetime = taskSequenceStart;
      const due_datetime   = dueDatetime(start_datetime, TASK_DURATION_DAYS);
      taskSequenceStart    = nextDayAt9(due_datetime);

      let result: { id: string; identifier: string };
      try {
        result = createTicket(db, {
          title, description,
          tier: 'Task',
          status: item.status || 'Backlog',
          parent_id: parent.id,
          start_datetime,
          due_datetime,
          llm_role: validRole,
          authorized_model,
          expected_token_usage: 100000,
          blocked_by: prevIdentifier,
        });
      } catch (e: any) {
        console.warn('[generate-children] Task skipped:', e.message);
        continue;
      }
      prevIdentifier = result.identifier;
      created.push({ id: result.id, identifier: result.identifier, title, description });
      createdTasks.push({ id: result.id, identifier: result.identifier, title });
    }

    if (created.length === 0) {
      return NextResponse.json({ success: false, error: 'All generated items had blank or invalid fields and were discarded.' }, { status: 500 });
    }

    // For Task generation: create a paired QA ticket for each task.
    // QA is blocked_by its linked Task.
    const createdQA: { id: string; identifier: string; taskIdentifier: string }[] = [];
    for (const task of createdTasks) {
      const taskRow = db.prepare('SELECT due_datetime FROM tickets WHERE id = ?').get(task.id) as any;
      const qaStart = taskRow?.due_datetime ? nextDayAt9(taskRow.due_datetime) : taskSequenceStart;
      const qaEnd   = dueDatetime(qaStart, QA_DURATION_DAYS);

      let qaModel: string | null = null;
      try {
        const roleRow = db.prepare("SELECT default_model FROM agent_roles WHERE name = 'Functional QA Engineer'").get() as any;
        if (roleRow?.default_model) qaModel = roleRow.default_model;
      } catch {}
      qaModel = qaModel || workspaceDefaultModel;

      let qaResult: { id: string; identifier: string };
      try {
        qaResult = createTicket(db, {
          title: `QA: Verify ${task.identifier} — ${task.title.slice(0, 50)}`,
          description: `Verify the implementation of ${task.title}.\n\nConfirm the definition of done is met for ${task.identifier}.\n\nUpload evidence (screenshots, test output) before approving the merge.`,
          tier: 'QA',
          status: 'Backlog',
          parent_id: task.id,
          start_datetime: qaStart,
          due_datetime: qaEnd,
          llm_role: 'Functional QA Engineer',
          authorized_model: qaModel,
          linked_ticket_id: task.identifier,
          blocked_by: task.identifier,
        });
      } catch (e: any) {
        console.warn('[generate-children] QA skipped:', e.message);
        continue;
      }
      createdQA.push({ id: qaResult.id, identifier: qaResult.identifier, taskIdentifier: task.identifier });
    }

    // Reschedule the epic waterfall after bulk child creation.
    try {
      const epicId = isStoryGen ? parent.id : (() => {
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
