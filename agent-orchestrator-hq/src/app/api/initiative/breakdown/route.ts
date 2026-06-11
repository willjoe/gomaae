import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getActiveProjectId } from '@/lib/db';
import { generateText } from '@/lib/ai/llm';
import { parseJsonLoose } from '@/lib/brainstorm';

/**
 * Turn the strategy (pillars + delegation) into an Epic (the WHY — a goal/outcome)
 * and Stories (the WHAT — one concrete feature each). Used at issuance time.
 */
export async function POST(request: Request) {
  try {
    if (!getActiveProjectId()) {
      return NextResponse.json({ success: false, error: 'No active workstation.' }, { status: 400 });
    }
    const { pillars, delegation, projectName } = await request.json();
    const p = pillars || {};
    const d = delegation || {};

    const prompt = `You are a product-planning engine for the project "${projectName || 'this project'}".
In our model an EPIC captures the WHY (the goal/outcome — the change we want for the user/business),
and STORIES capture the WHAT (one concrete feature each).

Strategy:
- Problem: ${p.problem || ''}
- Unique Value Proposition: ${p.solution || ''}
- Customer & Market: ${p.market || ''}
- Target Persona: ${d.persona || ''}
- Iconic Scene: ${d.scene || ''}
- Market Entry: ${p.entry || ''}
- Feasibility: ${p.feasibility || ''}
- Business Value: ${p.roi || ''}
- Must-have features: ${(d.mustHave || []).join('; ')}
- Nice-to-have features: ${(d.niceToHave || []).join('; ')}

Return ONLY a JSON object (no prose, no markdown fences):
{
  "epicTitle": "a concise goal/outcome statement — the WHY (what success looks like for the user/business). NOT a product description sentence; phrase it as the change/outcome.",
  "epicSummary": "2-4 sentences of strategic rationale — why this matters now.",
  "stories": [
    { "title": "Feature name (the WHAT)", "description": "what the feature does and the value it delivers, 2-3 sentences." }
  ]
}
Create one Story per distinct feature, derived primarily from the must-have features.
Stories MUST be concrete product features — never restatements of the strategy pillars.`;

    const parsed = parseJsonLoose(await generateText(prompt));
    return NextResponse.json({
      success: true,
      epicTitle: parsed.epicTitle || projectName || 'New Initiative',
      epicSummary: parsed.epicSummary || '',
      stories: Array.isArray(parsed.stories) ? parsed.stories : [],
    });
  } catch (error: any) {
    console.error('[API Initiative Breakdown] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
