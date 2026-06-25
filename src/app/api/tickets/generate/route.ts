import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { generateText } from '@/lib/ai/llm';
import { parseJsonLoose } from '@/lib/brainstorm';

const TIER_CONTEXT: Record<string, string> = {
  Epic:   'a high-level goal or strategic theme — the WHY behind a body of work',
  Story:  'a user-facing feature or capability — the WHAT a user can do',
  Task:   'an implementation detail, bug fix, or technical improvement — the HOW it gets built',
  QA:     'a quality-assurance or test ticket — the PROOF the parent task works correctly',
  Triage: 'an ad-hoc triage ticket for incoming requests or issues',
};

export async function POST(request: Request) {
  try {
    const { prompt, tier } = await request.json();
    if (!prompt?.trim()) {
      return NextResponse.json({ success: false, error: 'prompt is required.' }, { status: 400 });
    }

    const context = TIER_CONTEXT[tier] || 'a development ticket';
    const aiPrompt = `You are a product manager creating ${context}.

Based on the following instruction or feedback, generate a well-structured ticket:

"${prompt.trim()}"

Return ONLY a JSON object with these fields:
- "title": Concise, action-oriented title (max 80 characters, start with a verb)
- "description": 2–4 sentences covering scope, acceptance criteria, and any relevant context
- "status": One of "Backlog" | "To Do" | "In Progress" (default "Backlog")
- "role": Relevant agent role name if inferable from context, otherwise null

JSON:`;

    const raw = await generateText(aiPrompt);
    const parsed = parseJsonLoose(raw);

    return NextResponse.json({
      success: true,
      title: String(parsed.title || '').slice(0, 120).trim(),
      description: String(parsed.description || '').trim(),
      status: ['Backlog', 'To Do', 'In Progress'].includes(parsed.status) ? parsed.status : 'Backlog',
      role: parsed.role ? String(parsed.role).trim() : null,
    });
  } catch (e: any) {
    console.error('[API tickets/generate]', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
