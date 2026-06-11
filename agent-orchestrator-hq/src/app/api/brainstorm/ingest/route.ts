import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db, getActiveProjectId } from '@/lib/db';
import { generateText } from '@/lib/ai/llm';
import { readBrainstormGraph, mergeBrainstormGraph, parseJsonLoose, BRAINSTORM_CATEGORIES } from '@/lib/brainstorm';

/**
 * Send raw napkin text into the graph: the LLM extracts concepts (nodes) and
 * relationships (edges), which are merged into the local graph (deduped by title).
 * No summary here — that's the separate Synthesize step.
 */
export async function POST(request: Request) {
  try {
    if (!getActiveProjectId()) {
      return NextResponse.json({ success: false, error: 'No active workstation.' }, { status: 400 });
    }
    const { text } = await request.json();
    if (!text || !String(text).trim()) {
      return NextResponse.json({ success: false, error: 'Enter some text first.' }, { status: 400 });
    }

    const existing = db.prepare('SELECT title, category FROM brainstorm_nodes').all() as any[];
    const existingList = existing.map((n) => `- ${n.title} [${n.category}]`).join('\n') || '(none yet)';

    const prompt = `Extract a concept graph from the user's raw notes, MERGING with the existing graph (reuse existing concepts by their exact title; do not duplicate them).

Existing concepts:
${existingList}

User's new raw notes:
"""
${text}
"""

Return ONLY a JSON object (no prose, no markdown fences) with exactly:
{
  "nodes": [{ "title": "short concept (1-4 words)", "category": one of ${JSON.stringify(BRAINSTORM_CATEGORIES)}, "description": "one sentence" }],
  "edges": [{ "from": "node title", "to": "node title", "relationship_type": "how they connect" }]
}
Categorize each node to the closest strategic pillar. Only create edges between nodes you list.`;

    const parsed = parseJsonLoose(await generateText(prompt));
    db.transaction(() => mergeBrainstormGraph(parsed.nodes, parsed.edges))();

    return NextResponse.json({ success: true, ...readBrainstormGraph() });
  } catch (error: any) {
    console.error('[API Brainstorm Ingest] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
