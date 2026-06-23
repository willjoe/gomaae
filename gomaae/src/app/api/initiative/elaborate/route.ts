import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getActiveProjectId } from '@/lib/db';
import { generateText } from '@/lib/ai/llm';
import { parseJsonLoose } from '@/lib/brainstorm';

/**
 * Elaborate one Story (a product feature — the WHAT) into:
 *  - a PRD backing the feature idea, and
 *  - the engineering Tasks (the HOW), each with a TDD carrying all the
 *    information needed to build it.
 * Called per-story at Epic issuance time.
 */
export async function POST(request: Request) {
  try {
    if (!getActiveProjectId()) {
      return NextResponse.json({ success: false, error: 'No active workstation.' }, { status: 400 });
    }
    const { story, pillars, delegation, projectName } = await request.json();
    if (!story?.title) {
      return NextResponse.json({ success: false, error: 'story.title is required.' }, { status: 400 });
    }
    const p = pillars || {};
    const d = delegation || {};

    const prompt = `You are a senior product manager and tech lead for the project "${projectName || 'this project'}".
In our model a STORY is one concrete product feature (the WHAT), and its TASKS are the engineering work (the HOW).

Product strategy context:
- Problem: ${p.problem || ''}
- Unique Value Proposition: ${p.solution || ''}
- Target Persona: ${d.persona || ''}
- Iconic Scene: ${d.scene || ''}
- Must-have features: ${(d.mustHave || []).join('; ')}

The feature to elaborate:
- Title: ${story.title}
- Description: ${story.description || ''}

Produce:
1. A PRD (Product Requirements Document) for this feature, in Markdown, with these sections:
   Overview, Problem & Goals, User Stories, Functional Requirements, Acceptance Criteria, Out of Scope, Open Questions.
   The PRD answers WHAT this feature is and why it is worth building — written for humans deciding and reviewing scope.
2. 2-5 engineering TASKS that together implement the feature. Each task is independently implementable and has a
   TDD (Technical Design Document), in Markdown, with these sections:
   Objective, Technical Approach, Data Model, API / Interfaces, Components, Edge Cases & Error Handling, Testing Strategy.
   Each TDD answers HOW to build that slice — written so a developer can implement it without further context.

Return ONLY a JSON object (no prose, no markdown fences):
{
  "prd": "the full PRD markdown",
  "tasks": [
    { "title": "Task name (the HOW)", "description": "1-2 sentences of what this task delivers", "tdd": "the full TDD markdown" }
  ]
}`;

    const parsed = parseJsonLoose(await generateText(prompt));
    const tasks = (Array.isArray(parsed.tasks) ? parsed.tasks : [])
      .filter((t: any) => t?.title)
      .map((t: any) => ({ title: String(t.title), description: String(t.description || ''), tdd: String(t.tdd || '') }));

    return NextResponse.json({ success: true, prd: String(parsed.prd || ''), tasks });
  } catch (error: any) {
    console.error('[API Initiative Elaborate] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
