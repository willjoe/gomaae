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
    "metricName": "the key success metric to track (the primary metric, with a clear denominator)",
    "metricTarget": <number>,
    "metricDays": <number of days for the metric window, e.g. 30>,
    "secondaryMetrics": ["supporting measurable statement, e.g. a guardrail, counter-metric, or leading indicator with a concrete threshold", "..."],
    "metricNotes": "how the primary metric is measured (events/tool/segment), the baseline it's compared against, what counts as a session/user, and which counter-metric must not regress"
  },
  "cultural": {
    "teamEnthusiasm": "why the team genuinely wants to build this — the personal pull beyond the business case",
    "coreValues": ["organizational value this initiative upholds", "..."],
    "internalChampion": "who the internal champion is and why they are committed",
    "riskAppetite": "one of: low, medium, high, experimental",
    "brandFit": "how this initiative reinforces or extends the organization's brand and identity"
  }
}
The response must be strictly valid JSON: escape newlines inside strings as \\n and double quotes as \\" — no trailing commas.`;

    const rawText = await generateText(prompt);
    let parsed: any;
    try {
      parsed = parseJsonLoose(rawText);
    } catch (e) {
      try { require('fs').writeFileSync('/tmp/hiad-synthesize-raw.txt', rawText); } catch { /* ignore */ }
      throw e;
    }

    const put = db.prepare('INSERT OR REPLACE INTO project_settings (key, value) VALUES (?, ?)');
    if (parsed.summary) put.run('brainstorm_summary', String(parsed.summary));
    if (parsed.pillars) put.run('brainstorm_pillars', JSON.stringify(parsed.pillars));
    if (parsed.delegation) put.run('brainstorm_delegation', JSON.stringify(parsed.delegation));
    if (parsed.cultural) put.run('brainstorm_cultural', JSON.stringify(parsed.cultural));

    return NextResponse.json({
      success: true,
      summary: parsed.summary || '',
      pillars: parsed.pillars || {},
      delegation: parsed.delegation || {},
      cultural: parsed.cultural || {},
    });
  } catch (error: any) {
    console.error('[API Brainstorm Synthesize] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
