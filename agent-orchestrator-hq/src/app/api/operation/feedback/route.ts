// POST /api/operation/feedback
// Converts user feedback into a full OPS → Story → Task → QA ticket hierarchy.
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

function generateId() {
  return `tkt-${Math.random().toString(36).substr(2, 9)}`;
}

function slug(str: string) {
  return str.trim().replace(/ /g, '_').replace(/[\[\]]/g, '');
}

export async function POST(request: Request) {
  try {
    const { db, getActiveProjectId } = require('@/lib/db');
    const projectId = getActiveProjectId();

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'No active project' }, { status: 400 });
    }

    const body = await request.json();
    const { feedback, source, product } = body as { feedback: string; source?: string; product?: string };

    if (!feedback || typeof feedback !== 'string' || feedback.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'feedback is required' }, { status: 400 });
    }

    // ── AI generation (best-effort; falls back to string construction on failure) ──
    let opTitle = '';
    let storyTitle = '';
    let storyDesc = '';
    let taskTitles: string[] = [];

    try {
      const { generateText } = require('@/lib/ai/llm');

      const aiPrompt = `You are a Customer Success Manager converting user feedback into actionable tickets.

Feedback: """${feedback}"""
Source: ${source || 'User Report'}
Product: ${product || 'the product'}

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "opTitle": "<3-8 word concise summary of the feedback>",
  "storyTitle": "<starts with a verb: Fix/Add/Improve/Refactor... — what to build/fix in response>",
  "storyDesc": "<user story: As a [user], I want [feature] so that [benefit]. Context: [feedback summary]>",
  "taskTitles": ["<concrete implementation task 1>", "<concrete implementation task 2>", "<concrete implementation task 3>"]
}`;

      const raw = await generateText(aiPrompt);
      // Strip markdown code fences if present
      const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(jsonStr);
      opTitle = parsed.opTitle || '';
      storyTitle = parsed.storyTitle || '';
      storyDesc = parsed.storyDesc || '';
      taskTitles = Array.isArray(parsed.taskTitles) ? parsed.taskTitles.slice(0, 3) : [];
    } catch (aiErr) {
      console.warn('[operation/feedback] AI generation failed, using fallback:', aiErr);
    }

    // ── String construction fallbacks ──
    const feedbackTrunc = feedback.slice(0, 120);
    if (!opTitle) {
      opTitle = feedback.split(/[.!?]/)[0].trim().slice(0, 60) || 'User feedback received';
    }
    if (!storyTitle) {
      storyTitle = `Fix: ${feedbackTrunc.slice(0, 60)}`;
    }
    if (!storyDesc) {
      storyDesc = `As a user, I want the issue reported to be resolved so that I have a better experience.\n\nContext: ${feedback}`;
    }
    if (taskTitles.length === 0) {
      taskTitles = [
        `Investigate and reproduce: ${feedbackTrunc.slice(0, 50)}`,
        `Implement fix for: ${feedbackTrunc.slice(0, 50)}`,
        `Verify fix and update documentation`,
      ];
    }

    // ── Helper: insert ticket ──
    const countRes = () => (db.prepare('SELECT count(*) as c FROM tickets').get() as any)?.c || 0;
    const PREFIX: Record<string, string> = { Operation: 'OPS', Story: 'TKT', Task: 'TKT', QA: 'QA' };

    function insertTicket(opts: {
      tier: string;
      title: string;
      description: string;
      parent_id?: string | null;
      status?: string;
      llm_role?: string | null;
      linked_ticket_id?: string | null;
    }) {
      const id = generateId();
      const prefix = PREFIX[opts.tier] || 'TKT';
      const identifier = `${prefix}-${1000 + countRes()}`;
      db.prepare(`
        INSERT INTO tickets (id, identifier, title, description, status, tier, parent_id, llm_role, linked_ticket_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        identifier,
        opts.title,
        opts.description,
        opts.status || 'Todo',
        opts.tier,
        opts.parent_id || null,
        opts.llm_role || null,
        opts.linked_ticket_id || null,
      );
      return { id, identifier };
    }

    // ── 1. Create Operation ticket (root — no parent) ──
    const sourceLabel = source ? ` [${source}]` : '';
    const productLabel = product ? ` — ${product}` : '';
    const operation = insertTicket({
      tier: 'Operation',
      title: opTitle,
      description: `Operation ticket from user feedback: ${opTitle}\n\nSource${sourceLabel}${productLabel}\n\nOriginal feedback:\n${feedback}`,
      status: 'Todo',
      llm_role: 'Customer Success Manager',
    });

    // ── 2. Create Story child ──
    const story = insertTicket({
      tier: 'Story',
      title: storyTitle,
      description: storyDesc,
      parent_id: operation.id,
      status: 'Todo',
    });

    // ── 3. Create 2-3 Task children of the Story ──
    const tasks: { id: string; identifier: string; title: string }[] = [];
    for (const taskTitle of taskTitles) {
      const task = insertTicket({
        tier: 'Task',
        title: taskTitle,
        description: `Implementation task for: ${storyTitle}\n\nParent story: ${story.identifier}\nFeedback context: ${feedback.slice(0, 300)}`,
        parent_id: story.id,
        status: 'Todo',
      });
      tasks.push({ ...task, title: taskTitle });
    }

    // ── 4. Create 1 QA ticket per Task ──
    const qaTickets: { id: string; identifier: string; taskId: string }[] = [];
    for (const task of tasks) {
      const qa = insertTicket({
        tier: 'QA',
        title: `QA: Verify ${task.identifier} — ${task.title.slice(0, 50)}`,
        description: `Verify implementation of ${task.title}.\n\nConfirm definition of done is met for ${task.identifier}.`,
        parent_id: task.id,
        status: 'Todo',
        llm_role: 'Functional QA Engineer',
        linked_ticket_id: task.identifier,
      });
      qaTickets.push({ ...qa, taskId: task.id });
    }

    return NextResponse.json({
      success: true,
      operation: { id: operation.id, identifier: operation.identifier, title: opTitle },
      story: { id: story.id, identifier: story.identifier, title: storyTitle },
      tasks: tasks.map(t => ({ id: t.id, identifier: t.identifier, title: t.title })),
      qaTickets: qaTickets.map(q => ({ id: q.id, identifier: q.identifier, taskId: q.taskId })),
    });
  } catch (error: any) {
    console.error('[operation/feedback] Critical Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
