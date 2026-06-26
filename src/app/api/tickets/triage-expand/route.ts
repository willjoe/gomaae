/**
 * POST /api/tickets/triage-expand
 *
 * Converts a plain-language issue description into a full Operation → Story →
 * Task + QA ticket hierarchy. All tickets are created via createTicket() so
 * field validation is enforced centrally.
 */
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { generateText } from '@/lib/ai/llm';
import { parseJsonLoose } from '@/lib/brainstorm';
import { getAgentRoles } from '@/lib/agentRoles';
import { createTicket } from '@/lib/ticketCreate';
import { nextMonday, dueDatetime, nextDayAt9 } from '@/lib/epicDates';

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

    const opTitle    = (parsed.opTitle    || description.slice(0, 60)).trim();
    const opDesc     = (parsed.opDesc     || `Issue report:\n${description}`).trim();
    const storyTitle = (parsed.storyTitle || `Investigate and fix: ${description.slice(0, 60)}`).trim();
    const storyDesc  = (parsed.storyDesc  || `As a user, I want this issue resolved.\n\nContext: ${description}`).trim();
    const taskItems: { title: string; description: string; llm_role?: string }[] =
      Array.isArray(parsed.tasks) && parsed.tasks.length > 0
        ? parsed.tasks
        : [
            { title: 'Reproduce and isolate the issue',  description: `Reproduce the reported issue: ${description.slice(0, 200)}. Document steps and environment.`, llm_role: taskRoles[0]?.name },
            { title: 'Implement the fix', description: `Implement the resolution for: ${storyTitle}. Ensure tests cover the regression scenario.`, llm_role: taskRoles[0]?.name },
          ];

    function lookupModel(roleName: string | null): string | null {
      if (!roleName) return null;
      try {
        const row = db.prepare('SELECT default_model FROM agent_roles WHERE name = ?').get(roleName) as any;
        return row?.default_model ?? null;
      } catch { return null; }
    }

    function workspaceModel(): string | null {
      try {
        const eng = (db.prepare('SELECT value FROM project_settings WHERE key = ?').get('default_ai_engine') as any)?.value;
        return eng && eng !== 'null' && eng !== 'undefined' ? eng : null;
      } catch { return null; }
    }

    const opStart = nextMonday();

    // ── 1. Operation (top-level, no parent) ───────────────────────────────
    const opDuePlaceholder = dueDatetime(opStart, 14);
    const opRole = taskRoles[0]?.name || 'Frontend Web Engineer';
    const opModel = lookupModel(opRole) || workspaceModel();
    let opResult: { id: string; identifier: string };
    try {
      opResult = createTicket(db, {
        title: opTitle,
        description: opDesc,
        tier: 'Operation',
        status: 'Backlog',
        start_datetime: opStart,
        due_datetime: opDuePlaceholder,
        llm_role: opRole,
        authorized_model: opModel,
      });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: `Operation: ${e.message}` }, { status: 400 });
    }

    // ── 2. Story (defines the issue) ──────────────────────────────────────
    const storyDuePlaceholder = dueDatetime(opStart, 7);
    const storyRole = taskRoles[0]?.name || 'Frontend Web Engineer';
    const storyModel = lookupModel(storyRole) || workspaceModel();
    let storyResult: { id: string; identifier: string };
    try {
      storyResult = createTicket(db, {
        title: storyTitle,
        description: storyDesc,
        tier: 'Story',
        status: 'Backlog',
        parent_id: opResult.id,
        start_datetime: opStart,
        due_datetime: storyDuePlaceholder,
        llm_role: storyRole,
        authorized_model: storyModel,
      });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: `Story: ${e.message}` }, { status: 400 });
    }

    // ── 3. Tasks + QA pairs ───────────────────────────────────────────────
    const createdTasks: { id: string; identifier: string; title: string }[] = [];
    const createdQA: { id: string; identifier: string; taskIdentifier: string }[] = [];
    let taskStart = opStart;
    let prevTaskIdentifier: string | null = null;

    for (const item of taskItems) {
      const title    = (item.title       || '').trim();
      const taskDesc = (item.description || '').trim();
      if (!title) continue;

      const suggestedRole = item.llm_role?.trim() ?? null;
      const validRole = suggestedRole && taskRoles.some((r) => r.name === suggestedRole)
        ? suggestedRole
        : (taskRoles[0]?.name || 'Frontend Web Engineer');
      const taskModel = lookupModel(validRole) || workspaceModel();

      const taskDue = dueDatetime(taskStart, 3);

      let taskResult: { id: string; identifier: string };
      try {
        taskResult = createTicket(db, {
          title,
          description: taskDesc || `Implementation step for: ${storyTitle}`,
          tier: 'Task',
          status: 'Backlog',
          parent_id: storyResult.id,
          start_datetime: taskStart,
          due_datetime: taskDue,
          llm_role: validRole,
          authorized_model: taskModel,
          expected_token_usage: 100000,
          blocked_by: prevTaskIdentifier,
        });
      } catch (e: any) {
        console.warn('[triage-expand] Task skipped:', e.message);
        continue;
      }
      prevTaskIdentifier = taskResult.identifier;
      createdTasks.push({ id: taskResult.id, identifier: taskResult.identifier, title });

      // QA paired with this Task — blocked_by the Task
      const qaStart = nextDayAt9(taskDue);
      const qaEnd   = dueDatetime(qaStart, 2);
      const qaModel = lookupModel('Functional QA Engineer') || workspaceModel();
      let qaResult: { id: string; identifier: string };
      try {
        qaResult = createTicket(db, {
          title: `QA: Verify ${taskResult.identifier} — ${title.slice(0, 50)}`,
          description: `Verify the implementation of ${title}.\n\nConfirm the definition of done is met for ${taskResult.identifier}.\n\nUpload evidence (screenshots, test output, logs) before approving the merge.`,
          tier: 'QA',
          status: 'Backlog',
          parent_id: taskResult.id,
          start_datetime: qaStart,
          due_datetime: qaEnd,
          llm_role: 'Functional QA Engineer',
          authorized_model: qaModel,
          linked_ticket_id: taskResult.identifier,
          blocked_by: taskResult.identifier,
        });
      } catch (e: any) {
        console.warn('[triage-expand] QA skipped:', e.message);
        taskStart = nextDayAt9(taskDue);
        continue;
      }
      createdQA.push({ id: qaResult.id, identifier: qaResult.identifier, taskIdentifier: taskResult.identifier });

      taskStart = nextDayAt9(taskDue);
    }

    // Back-fill Story and Operation due dates from the last task's schedule.
    const lastTask = db.prepare(
      "SELECT due_datetime FROM tickets WHERE parent_id = ? AND tier = 'Task' ORDER BY due_datetime DESC LIMIT 1"
    ).get(storyResult.id) as any;
    const storyDue = lastTask?.due_datetime ?? storyDuePlaceholder;
    const opDue    = storyDue ?? opDuePlaceholder;
    db.prepare('UPDATE tickets SET due_datetime = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(storyDue, storyResult.id);
    db.prepare('UPDATE tickets SET due_datetime = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(opDue, opResult.id);

    return NextResponse.json({
      success: true,
      operation: { id: opResult.id,    identifier: opResult.identifier,    title: opTitle },
      story:     { id: storyResult.id, identifier: storyResult.identifier, title: storyTitle },
      tasks: createdTasks,
      qaTickets: createdQA,
    });
  } catch (err: any) {
    console.error('[API tickets/triage-expand]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
