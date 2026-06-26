/**
 * POST /api/tickets/triage-expand
 *
 * Converts a plain-language issue description into a full Operation → Story →
 * Task + QA ticket hierarchy.
 *
 * Operation — same hierarchy level as Epic; contains all work for this issue.
 * Story     — defines the issue: what happened, what to investigate, acceptance criteria.
 * Tasks     — implementation steps to solve the issue (2-4 tickets).
 * QA        — one paired test ticket per Task; shares the Task's branch.
 */
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { generateText } from '@/lib/ai/llm';
import { parseJsonLoose } from '@/lib/brainstorm';
import { getAgentRoles } from '@/lib/agentRoles';

function localISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function nextMonday(from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7));
  return localISO(d);
}
function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return localISO(d);
}

export async function POST(request: Request) {
  try {
    const { db, getActiveProjectId } = require('@/lib/db');
    if (!getActiveProjectId()) {
      return NextResponse.json({ success: false, error: 'No active workstation.' }, { status: 400 });
    }

    const { description } = await request.json();
    if (!description?.trim()) {
      return NextResponse.json({ success: false, error: 'description is required.' }, { status: 400 });
    }

    const taskRoles = getAgentRoles({ activeOnly: true, lifecycle: 'development' });
    const roleList = taskRoles.map((r) => r.name).join(' | ');

    const aiPrompt = `You are a senior engineering manager triaging an incoming issue report and breaking it into actionable work.

Issue: """${description.trim()}"""

Create a structured work hierarchy:
- Operation: a container for all work on this issue (same level as an Epic)
- Story: defines the issue — what was reported, what to investigate, and the acceptance criteria for "fixed"
- Tasks: 2 to 4 concrete implementation steps to resolve the issue

Available task agent roles: ${roleList}

Return ONLY this JSON object (no prose, no markdown fences):
{
  "opTitle": "3-7 word summary of the issue",
  "opDesc": "1-2 sentences: the issue context and why it matters",
  "storyTitle": "starts with Investigate: or Fix: — what needs to be understood and resolved",
  "storyDesc": "As a user, I want [resolution] so that [benefit]. Context: [issue summary]. Acceptance criteria: [what done looks like].",
  "tasks": [
    {
      "title": "Concrete implementation action, max 10 words",
      "description": "2-3 sentences: what to do, the approach, definition of done.",
      "llm_role": "exact role name from the available list"
    }
  ]
}`;

    let parsed: any = {};
    try {
      parsed = parseJsonLoose(await generateText(aiPrompt));
    } catch {
      parsed = {};
    }

    const opTitle = (parsed.opTitle || description.slice(0, 60)).trim();
    const opDesc = (parsed.opDesc || `Issue report:\n${description}`).trim();
    const storyTitle = (parsed.storyTitle || `Investigate and fix: ${description.slice(0, 60)}`).trim();
    const storyDesc = (parsed.storyDesc || `As a user, I want this issue resolved.\n\nContext: ${description}`).trim();
    const taskItems: { title: string; description: string; llm_role?: string }[] =
      Array.isArray(parsed.tasks) && parsed.tasks.length > 0
        ? parsed.tasks
        : [
            { title: 'Reproduce and isolate the issue', description: `Reproduce the reported issue: ${description.slice(0, 200)}. Document steps and environment.` },
            { title: 'Implement the fix', description: `Implement the resolution for: ${storyTitle}. Ensure tests cover the regression scenario.` },
          ];

    const PREFIX: Record<string, string> = { Operation: 'OPS', QA: 'QA' };
    const countBase = () => (db.prepare('SELECT count(*) as c FROM tickets').get() as any)?.c || 0;

    function mkId() { return `tkt-${Math.random().toString(36).substr(2, 9)}`; }
    function mkIdentifier(tier: string) {
      return `${PREFIX[tier] || 'TKT'}-${1000 + countBase()}`;
    }

    function lookupModel(roleName: string | null): string | null {
      if (!roleName) return null;
      try {
        const row = db.prepare('SELECT default_model FROM agent_roles WHERE name = ?').get(roleName) as any;
        return row?.default_model ?? null;
      } catch { return null; }
    }

    // ── 1. Operation ticket (top-level, no parent) ──
    const opStart = nextMonday();
    const opId = mkId();
    const opIdentifier = mkIdentifier('Operation');
    db.prepare(`
      INSERT INTO tickets (id, identifier, title, description, status, tier, start_date, llm_role)
      VALUES (?, ?, ?, ?, 'Backlog', 'Operation', ?, ?)
    `).run(opId, opIdentifier, opTitle, opDesc, opStart, null);

    // ── 2. Story (defines the issue) ──
    const storyStart = opStart;
    const storyId = mkId();
    const storyIdentifier = mkIdentifier('Story');
    db.prepare(`
      INSERT INTO tickets (id, identifier, title, description, status, tier, parent_id, start_date)
      VALUES (?, ?, ?, ?, 'Backlog', 'Story', ?, ?)
    `).run(storyId, storyIdentifier, storyTitle, storyDesc, opId, storyStart);

    // ── 3. Tasks + QA pairs ──
    const createdTasks: { id: string; identifier: string; title: string }[] = [];
    const createdQA: { id: string; identifier: string; taskIdentifier: string }[] = [];
    let taskStart = storyStart;

    for (const item of taskItems) {
      const title = (item.title || '').trim();
      const taskDesc = (item.description || '').trim();
      if (!title) continue;

      const suggestedRole = item.llm_role?.trim() ?? null;
      const validRole = suggestedRole && taskRoles.some((r) => r.name === suggestedRole)
        ? suggestedRole
        : 'Frontend Web Engineer';
      const taskModel = lookupModel(validRole);

      const taskId = mkId();
      const taskIdentifier = mkIdentifier('Task');
      const taskDue = addDays(taskStart, 2);
      db.prepare(`
        INSERT INTO tickets (id, identifier, title, description, status, tier, parent_id, start_date, due_date, llm_role, authorized_model, expected_token_usage, linked_ticket_id)
        VALUES (?, ?, ?, ?, 'Backlog', 'Task', ?, ?, ?, ?, ?, 100000, NULL)
      `).run(taskId, taskIdentifier, title, taskDesc || `Implementation step for: ${storyTitle}`, storyId, taskStart, taskDue, validRole, taskModel);

      createdTasks.push({ id: taskId, identifier: taskIdentifier, title });

      // QA ticket paired with this Task
      const qaStart = addDays(taskDue, 1);
      const qaId = mkId();
      const qaIdentifier = mkIdentifier('QA');
      const qaModel = lookupModel('Functional QA Engineer');
      db.prepare(`
        INSERT INTO tickets (id, identifier, title, description, status, tier, parent_id, start_date, due_date, llm_role, authorized_model, linked_ticket_id)
        VALUES (?, ?, ?, ?, 'Backlog', 'QA', ?, ?, ?, 'Functional QA Engineer', ?, ?)
      `).run(
        qaId, qaIdentifier,
        `QA: Verify ${taskIdentifier} — ${title.slice(0, 50)}`,
        `Verify the implementation of ${title}.\n\nConfirm the definition of done is met for ${taskIdentifier}.\n\nUpload evidence (screenshots, test output, logs) before approving the merge.`,
        taskId, qaStart, addDays(qaStart, 1), qaModel, taskIdentifier,
      );
      createdQA.push({ id: qaId, identifier: qaIdentifier, taskIdentifier });

      taskStart = addDays(taskDue, 1);
    }

    // Set Story and Operation due dates from the last task's schedule.
    const storyDue = createdTasks.length > 0
      ? (db.prepare("SELECT due_date FROM tickets WHERE parent_id = ? AND tier = 'Task' ORDER BY due_date DESC LIMIT 1").get(storyId) as any)?.due_date ?? null
      : addDays(storyStart, 7);
    const opDue = storyDue ?? addDays(opStart, 14);
    db.prepare('UPDATE tickets SET due_date = ? WHERE id = ?').run(storyDue, storyId);
    db.prepare('UPDATE tickets SET due_date = ? WHERE id = ?').run(opDue, opId);

    return NextResponse.json({
      success: true,
      operation: { id: opId, identifier: opIdentifier, title: opTitle },
      story: { id: storyId, identifier: storyIdentifier, title: storyTitle },
      tasks: createdTasks,
      qaTickets: createdQA,
    });
  } catch (err: any) {
    console.error('[API tickets/triage-expand]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
