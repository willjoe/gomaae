import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db, getActiveProjectId } from '@/lib/db';
import { generateText } from '@/lib/ai/llm';
import { parseJsonLoose } from '@/lib/brainstorm';
import { hashContent } from '@/lib/hash';

/**
 * Ticket fulfillment scores (0-100) + feedback, like the pillar/delegation scores.
 * The bar is tier-specific:
 *   Epic  — perfectly explains WHY we are doing this project.
 *   Story — perfectly explains WHAT we are building (the feature).
 *   Task  — perfectly explains HOW the feature is built.
 *   QA/UnitTest — once completed, proves the parent Task's definition of done
 *                 is met and truly works.
 * All attributes being filled is part of the bar for every tier.
 */

const TIER_BAR: Record<string, string> = {
  Epic: 'An Epic must perfectly explain WHY this project is being done: the goal/outcome, who it serves, and the strategic rationale. Judge whether someone reading only this ticket would understand and believe in the why.',
  Story: 'A Story must perfectly explain WHAT is being built: one concrete product feature, its scope, the value it delivers, and how we know it is done. Judge whether someone reading only this ticket would know exactly what to build (not how).',
  Task: 'A Task must perfectly explain HOW the feature is built: the technical approach, touched components/interfaces, and a clear definition of done. Judge whether a developer reading only this ticket could implement it without guessing.',
  QA: "A Test ticket, once completed, must prove that what its parent Task defined as the definition of done is completed and truly works: concrete test cases, expected results, and traceability to the parent Task's criteria.",
  UnitTest: "A Test ticket, once completed, must prove that what its parent Task defined as the definition of done is completed and truly works: concrete test cases, expected results, and traceability to the parent Task's criteria.",
};

/** Compose the rateable substance of a ticket (also the hash input). */
function composeContent(t: any): string {
  const attrs = [
    `status: ${t.status || '(empty)'}`,
    // Epics are top-level — no parent expected; everything else should have one.
    `parent: ${t.tier === 'Epic' ? '(n/a — Epics are top-level)' : t.parent_id ? 'set' : '(empty)'}`,
    `start_datetime: ${t.start_datetime ? t.start_datetime.slice(0, 10) : '(empty)'}`,
    `due_datetime: ${t.due_datetime ? t.due_datetime.slice(0, 10) : '(empty)'}`,
    `assigned_agent: ${t.assigned_agent_id || '(empty)'}`,
    `agent_role: ${t.llm_role || '(empty)'}`,
    `authorized_model: ${t.authorized_model || '(empty)'}`,
    `attached_document: ${t.document_name || '(none)'}`,
  ];
  const parts = [
    `Tier: ${t.tier}`,
    `Title: ${t.title || '(empty)'}`,
    `Description:\n${t.description || '(empty)'}`,
    `Attributes:\n${attrs.join('\n')}`,
  ];
  if (t.document_content) parts.push(`Attached document (${t.document_name || 'untitled'}):\n${String(t.document_content).slice(0, 6000)}`);
  return parts.join('\n\n');
}

export async function GET(request: Request) {
  try {
    if (!getActiveProjectId()) return NextResponse.json({ success: true, scores: {} });
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    const rows = (ticketId
      ? db.prepare('SELECT ticket_id, score, feedback, content_hash FROM ticket_scores WHERE ticket_id = ?').all(ticketId)
      : db.prepare('SELECT ticket_id, score, feedback, content_hash FROM ticket_scores').all()) as any[];
    const scores: Record<string, { score: number; feedback: string; hash: string }> = {};
    rows.forEach((r) => { scores[r.ticket_id] = { score: r.score, feedback: r.feedback || '', hash: r.content_hash || '' }; });
    return NextResponse.json({ success: true, scores });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * (Re)rate one ticket. Idempotent and cheap when nothing changed: the substance
 * is hashed and an up-to-date stored score is returned without calling the LLM.
 */
export async function POST(request: Request) {
  try {
    if (!getActiveProjectId()) return NextResponse.json({ success: false, error: 'No active workstation.' }, { status: 400 });
    const { ticketId } = await request.json();
    if (!ticketId) return NextResponse.json({ success: false, error: 'ticketId is required.' }, { status: 400 });

    const t = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId) as any;
    if (!t) return NextResponse.json({ success: false, error: 'Ticket not found.' }, { status: 404 });

    let content = composeContent(t);

    // Test tickets are judged against their parent Task's definition of done.
    const isTest = t.tier === 'QA' || t.tier === 'UnitTest';
    if (isTest && t.parent_id) {
      const parent = db.prepare('SELECT title, description, document_content FROM tickets WHERE id = ?').get(t.parent_id) as any;
      if (parent) {
        content += `\n\nParent Task (whose definition of done this test must prove):\nTitle: ${parent.title}\nDescription:\n${parent.description || '(empty)'}`;
        if (parent.document_content) content += `\nParent document:\n${String(parent.document_content).slice(0, 4000)}`;
      }
    }

    const hash = hashContent(content);
    const existing = db.prepare('SELECT score, feedback, content_hash FROM ticket_scores WHERE ticket_id = ?').get(ticketId) as any;
    if (existing && existing.content_hash === hash) {
      return NextResponse.json({ success: true, score: existing.score, feedback: existing.feedback || '', hash, cached: true });
    }

    const bar = TIER_BAR[t.tier] || 'This ticket must fully and unambiguously describe its purpose so the next person can act on it without guessing.';
    const prompt = `You are a Product Management AI Supporter reviewing one ticket of a software project for FULFILLNESS.

${bar}

Additionally, ALL ticket attributes need to be filled (status, parent, dates, assigned agent, role, model, attached document where applicable) — missing attributes lower the score.

Ticket:
"""
${content}
"""

Rate the ticket's fulfillness on a 0-100 scale:
0 = vague or missing, 50 = a reasonable draft with notable gaps, 100 = the tier's bar above is perfectly met and all attributes are filled.

Judge ONLY the substance and completeness — not grammar, wording, formatting, or prose style.
Feedback must name the most important concrete gaps (e.g. which attribute is empty, what the description fails to answer for its tier).

Return ONLY a JSON object: { "score": <integer 0-100>, "feedback": "1-3 sentences of specific, substance-focused feedback" }`;

    const parsed = parseJsonLoose(await generateText(prompt));
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
    const feedback = String(parsed.feedback || '');

    db.prepare(`
      INSERT INTO ticket_scores (ticket_id, score, feedback, content_hash, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(ticket_id) DO UPDATE SET score=excluded.score, feedback=excluded.feedback, content_hash=excluded.content_hash, updated_at=CURRENT_TIMESTAMP
    `).run(ticketId, score, feedback, hash);

    return NextResponse.json({ success: true, score, feedback, hash });
  } catch (error: any) {
    console.error('[API Ticket Score] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
