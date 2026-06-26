import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { generateText } from '@/lib/ai/llm';
import { parseJsonLoose } from '@/lib/brainstorm';

/** Walk up the ancestor chain from ticketId (inclusive) and build a context block. */
function buildAncestorContext(db: any, ticketId: string): string {
  const ancestors: any[] = [];
  let currentId: string | null = ticketId;
  const visited = new Set<string>();
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const row = db.prepare(
      'SELECT id, parent_id, tier, identifier, title, description, document_content FROM tickets WHERE id = ?'
    ).get(currentId) as any;
    if (!row) break;
    ancestors.unshift(row);
    currentId = row.parent_id ?? null;
  }
  return ancestors.map((a) => {
    const lines = [`[${a.tier}] ${a.identifier}: ${a.title}`];
    if (a.description?.trim()) lines.push(`Description: ${a.description.trim()}`);
    if (a.document_content?.trim()) lines.push(`Attached document:\n${String(a.document_content).trim().slice(0, 2000)}`);
    return lines.join('\n');
  }).join('\n\n---\n\n');
}

/**
 * POST /api/tickets/auto-fill
 *
 * Reads the full ancestor chain (title + description + attached documents) for a
 * ticket and uses the LLM to fill in any missing required fields:
 *   - description (acceptance criteria)
 *   - llm_role (which engineering role should implement this)
 *   - expected_token_usage (approximate token budget)
 *
 * Only fields that are currently blank are filled; existing values are preserved.
 * Returns the set of fields that were actually updated.
 */
export async function POST(request: Request) {
  try {
    const { db } = require('@/lib/db');
    const { ticketId } = await request.json();
    if (!ticketId) {
      return NextResponse.json({ success: false, error: 'ticketId is required.' }, { status: 400 });
    }

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId) as any;
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found.' }, { status: 404 });
    }

    // Collect the fields that are actually missing.
    const needsDescription = !ticket.description?.trim();
    const needsRole = !ticket.llm_role?.trim();
    const needsTokens = !ticket.expected_token_usage;
    const needsModel = !ticket.authorized_model?.trim();

    if (!needsDescription && !needsRole && !needsTokens && !needsModel) {
      return NextResponse.json({ success: true, filled: {}, message: 'All required fields already present.' });
    }

    // Build ancestor context (includes the ticket itself).
    const ancestorContext = buildAncestorContext(db, ticket.id);
    const contextBlock = ancestorContext
      ? `Full project context (ancestor chain, root first):\n\n${ancestorContext}`
      : `Ticket: [${ticket.tier}] ${ticket.identifier}: ${ticket.title}`;

    const missingList = [
      needsDescription && 'description',
      needsRole && 'llm_role',
      needsTokens && 'expected_token_usage',
    ].filter(Boolean).join(', ');

    // authorized_model is resolved from agent_roles after the LLM call — not sent to the prompt.

    const prompt = `You are a senior engineering lead reviewing a ticket that is missing required fields before an AI agent can run it.

${contextBlock}

Ticket to fill:
[${ticket.tier}] ${ticket.identifier}: ${ticket.title}
${ticket.description ? `Existing description: ${ticket.description}` : '(no description yet)'}

Missing fields that need to be filled: ${missingList}

Using the full project context above, produce a JSON object with values for only the missing fields:
${needsDescription ? `- "description": 3-6 sentences of clear acceptance criteria that tell the implementing engineer exactly what to build and what done looks like. Ground it in the ancestor context.` : ''}
${needsRole ? `- "llm_role": the specific engineering role best suited to implement this ticket (e.g. "Frontend Web Engineer", "Backend API Engineer", "DevOps Engineer", "Full-Stack Engineer", "QA Automation Engineer"). Pick the single most appropriate role.` : ''}
${needsTokens ? `- "expected_token_usage": an integer (50000–500000) estimating the LLM token budget for a coding agent to fully implement this ticket. Use 80000 for simple tasks, 150000 for medium, 300000 for complex.` : ''}

Return ONLY a JSON object (no prose, no markdown fences):
{ ${[
  needsDescription ? '"description": "..."' : '',
  needsRole ? '"llm_role": "..."' : '',
  needsTokens ? '"expected_token_usage": <integer>' : '',
].filter(Boolean).join(', ')} }`;

    const raw = await generateText(prompt);
    const filled = parseJsonLoose(raw) as Record<string, any>;

    if (!filled || typeof filled !== 'object') {
      return NextResponse.json({ success: false, error: 'LLM did not return valid field values.' }, { status: 500 });
    }

    // Persist only the fields that were actually missing and are now filled.
    const toUpdate: Record<string, any> = {};
    if (needsDescription && filled.description?.trim()) toUpdate.description = filled.description.trim();
    if (needsRole && filled.llm_role?.trim()) toUpdate.llm_role = filled.llm_role.trim();
    if (needsTokens && filled.expected_token_usage) {
      const val = Math.round(Number(filled.expected_token_usage));
      if (val > 0) toUpdate.expected_token_usage = val;
    }

    // Resolve authorized_model: role's default_model → workspace default_ai_engine.
    if (needsModel) {
      const finalRole = toUpdate.llm_role || ticket.llm_role;
      let resolvedModel: string | null = null;
      if (finalRole?.trim()) {
        try {
          const roleRow = db.prepare('SELECT default_model FROM agent_roles WHERE name = ?').get(finalRole.trim()) as any;
          if (roleRow?.default_model) resolvedModel = roleRow.default_model;
        } catch { /* agent_roles table may not exist yet */ }
      }
      // Fall back to the workspace's active AI engine — always set for AI-generated tickets.
      if (!resolvedModel) {
        try {
          const eng = (db.prepare('SELECT value FROM project_settings WHERE key = ?').get('default_ai_engine') as any)?.value;
          if (eng && eng !== 'null' && eng !== 'undefined') resolvedModel = eng;
        } catch { /* non-fatal */ }
      }
      if (resolvedModel) toUpdate.authorized_model = resolvedModel;
    }

    if (Object.keys(toUpdate).length > 0) {
      const keys = Object.keys(toUpdate);
      db.prepare(
        `UPDATE tickets SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).run(...keys.map((k) => toUpdate[k]), ticketId);
    }

    return NextResponse.json({ success: true, filled: toUpdate });
  } catch (error: any) {
    console.error('[API Tickets AutoFill] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
