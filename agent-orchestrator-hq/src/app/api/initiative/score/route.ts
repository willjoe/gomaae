import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db, getActiveProjectId } from '@/lib/db';
import { generateText } from '@/lib/ai/llm';
import { parseJsonLoose } from '@/lib/brainstorm';
import { hashContent } from '@/lib/hash';

/** All stored pillar scores for the active workstation (with the hash they were scored at). */
export async function GET() {
  try {
    if (!getActiveProjectId()) return NextResponse.json({ success: true, scores: {} });
    const rows = db.prepare('SELECT pillar, score, feedback, content_hash FROM pillar_scores').all() as any[];
    const scores: Record<string, { score: number; feedback: string; hash: string }> = {};
    rows.forEach((r) => { scores[r.pillar] = { score: r.score, feedback: r.feedback || '', hash: r.content_hash || '' }; });
    return NextResponse.json({ success: true, scores });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Rate how well a pillar is thought through (0-100) with feedback, via the Product
 * Management AI Supporter, and persist it. Called whenever a pillar's brief changes.
 */
export async function POST(request: Request) {
  try {
    if (!getActiveProjectId()) return NextResponse.json({ success: false, error: 'No active workstation.' }, { status: 400 });
    const { pillar, title, content } = await request.json();
    if (!pillar) return NextResponse.json({ success: false, error: 'pillar is required.' }, { status: 400 });

    // Empty pillar → clear its score.
    if (!content || !String(content).trim()) {
      db.prepare('DELETE FROM pillar_scores WHERE pillar = ?').run(pillar);
      return NextResponse.json({ success: true, score: null, feedback: '' });
    }

    const prompt = `You are a Product Management AI Supporter reviewing one pillar of a product strategy.

Pillar: ${title || pillar}
Content:
"""
${content}
"""

Rate how well thought-through this pillar is for the product to succeed, on a 0-100 scale:
0 = vague or missing, 50 = a reasonable draft with notable gaps, 100 = rigorous, specific, evidence-based and complete.

Judge ONLY the substance — the strategic objective: problem clarity, specificity, supporting evidence, soundness of reasoning, completeness, and awareness of risks/assumptions.
Do NOT rate or comment on writing mechanics: grammar, spelling, wording, formatting, length, or prose style. In particular, IGNORE any repetition or duplicated text — it is an artifact of combined drafts, not a flaw in the idea. Never include feedback like "remove the duplicated text" or other editorial cleanup.
Feedback must be about the idea itself (e.g. what evidence, assumptions, or specifics are missing).

Return ONLY a JSON object: { "score": <integer 0-100>, "feedback": "1-3 sentences of specific, substance-focused feedback" }`;

    const parsed = parseJsonLoose(await generateText(prompt));
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
    const feedback = String(parsed.feedback || '');
    const hash = hashContent(content);

    db.prepare(`
      INSERT INTO pillar_scores (pillar, score, feedback, content_hash, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(pillar) DO UPDATE SET score=excluded.score, feedback=excluded.feedback, content_hash=excluded.content_hash, updated_at=CURRENT_TIMESTAMP
    `).run(pillar, score, feedback, hash);

    return NextResponse.json({ success: true, score, feedback, hash });
  } catch (error: any) {
    console.error('[API Initiative Score] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
