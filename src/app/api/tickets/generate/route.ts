import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { generateText } from '@/lib/ai/llm';
import { parseJsonLoose } from '@/lib/brainstorm';
import { getAgentRoles } from '@/lib/agentRoles';
import { getPhaseForTier } from '@/lib/phaseConfig';
import { nextMonday } from '@/lib/epicDates';

const TIER_CONTEXT: Record<string, string> = {
  Epic:   'a high-level goal or strategic theme — the WHY behind a body of work',
  Story:  'a user-facing feature or capability — the WHAT a user can do',
  Task:   'an implementation detail, bug fix, or technical improvement — the HOW it gets built',
  QA:     'a quality-assurance or test ticket — the PROOF the parent task works correctly',
  Triage: 'an ad-hoc triage ticket for incoming requests or issues',
};

const TIER_DURATION_DAYS: Record<string, number> = {
  Epic: 28, Story: 14, Task: 3, QA: 2, Triage: 7,
};

function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function POST(request: Request) {
  try {
    const { prompt, tier } = await request.json();
    if (!prompt?.trim()) {
      return NextResponse.json({ success: false, error: 'prompt is required.' }, { status: 400 });
    }

    const phase = getPhaseForTier(tier);
    const availableRoles = getAgentRoles({ activeOnly: true, lifecycle: phase });
    const roleList = availableRoles.length
      ? availableRoles.map((r) => r.name).join(' | ')
      : null;

    const context = TIER_CONTEXT[tier] || 'a development ticket';
    const aiPrompt = `You are a product manager creating ${context}.

Based on the following instruction or feedback, generate a well-structured ticket:

"${prompt.trim()}"

Return ONLY a JSON object with these fields:
- "title": Concise, action-oriented title (max 80 characters, start with a verb)
- "description": 2–4 sentences covering scope, acceptance criteria, and any relevant context
- "status": One of "Backlog" | "To Do" | "In Progress" (default "Backlog")
${roleList ? `- "llm_role": The single most appropriate role from this list, or null: ${roleList}` : '- "llm_role": null'}

JSON:`;

    const raw = await generateText(aiPrompt);
    const parsed = parseJsonLoose(raw);

    const suggestedRole: string | null = parsed.llm_role ?? null;
    const validRole = suggestedRole && availableRoles.some((r) => r.name === suggestedRole)
      ? suggestedRole
      : null;

    const start_date = nextMonday();
    const due_date = addDays(start_date, TIER_DURATION_DAYS[tier] ?? 7);

    // Look up authorized_model from the role's DB configuration (best-effort).
    let authorized_model: string | null = null;
    if (validRole) {
      try {
        const { db } = require('@/lib/db');
        const roleRow = db.prepare('SELECT default_model FROM agent_roles WHERE name = ?').get(validRole) as any;
        if (roleRow?.default_model) authorized_model = roleRow.default_model;
      } catch {}
    }

    return NextResponse.json({
      success: true,
      title: String(parsed.title || '').slice(0, 120).trim(),
      description: String(parsed.description || '').trim(),
      status: ['Backlog', 'To Do', 'In Progress'].includes(parsed.status) ? parsed.status : 'Backlog',
      llm_role: validRole,
      start_date,
      due_date,
      authorized_model,
    });
  } catch (e: any) {
    console.error('[API tickets/generate]', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
