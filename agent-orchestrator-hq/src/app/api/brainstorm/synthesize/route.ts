import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db, getActiveProjectId } from '@/lib/db';
import { generateText } from '@/lib/ai/llm';
import { readBrainstormGraph, parseJsonLoose } from '@/lib/brainstorm';

/**
 * Synthesize the current concept graph: the LLM writes a structured summary and
 * drafts both Initiative steps — Strategic Conceptualization (pillars) and
 * Delegation & Guardrails. Operates on the whole graph (no text input).
 */
export async function POST() {
  try {
    if (!getActiveProjectId()) {
      return NextResponse.json({ success: false, error: 'No active workstation.' }, { status: 400 });
    }

    const { nodes, edges } = readBrainstormGraph();
    if (nodes.length === 0) {
      return NextResponse.json({ success: false, error: 'The graph is empty — send some ideas in first.' }, { status: 400 });
    }

    const nodeById: Record<string, any> = {};
    nodes.forEach((n) => { nodeById[n.id] = n; });
    const nodeList = nodes.map((n) => `${n.title} [${n.category}]`).join(', ');
    const edgeList = edges
      .map((e) => `${nodeById[e.from_id]?.title} -(${e.relationship_type})-> ${nodeById[e.to_id]?.title}`)
      .filter((s) => !s.includes('undefined'))
      .join('; ');

    const prompt = `You are a product-strategy synthesis engine. Given this concept graph, write a synthesis and draft the two Initiative steps.

Concepts: ${nodeList}
Relationships: ${edgeList || '(none)'}

Return ONLY a JSON object (no prose, no markdown fences) with exactly:
{
  "summary": "a concise, structured synthesis (markdown allowed)",
  "pillars": {
    "problem": "draft for Problem Definition",
    "market": "draft for Customer & Market",
    "solution": "draft for Unique Value Proposition",
    "entry": "draft for Market Entry",
    "feasibility": "draft for Technical Feasibility",
    "roi": "draft for ROI / Business Case"
  },
  "delegation": {
    "persona": "WHO the user is (a specific target user profile)",
    "scene": "the exact situation/moment when that persona reaches for this — the iconic scene (when, where, what they're doing, the pressure)",
    "mustHave": ["must-have requirement", "..."],
    "niceToHave": ["nice-to-have requirement", "..."],
    "metricName": "the key success metric to track",
    "metricTarget": <number>,
    "metricDays": <number of days for the metric window, e.g. 30>
  }
}`;

    const parsed = parseJsonLoose(await generateText(prompt));

    const put = db.prepare('INSERT OR REPLACE INTO project_settings (key, value) VALUES (?, ?)');
    if (parsed.summary) put.run('brainstorm_summary', String(parsed.summary));
    if (parsed.pillars) put.run('brainstorm_pillars', JSON.stringify(parsed.pillars));
    if (parsed.delegation) put.run('brainstorm_delegation', JSON.stringify(parsed.delegation));

    return NextResponse.json({
      success: true,
      summary: parsed.summary || '',
      pillars: parsed.pillars || {},
      delegation: parsed.delegation || {},
    });
  } catch (error: any) {
    console.error('[API Brainstorm Synthesize] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
