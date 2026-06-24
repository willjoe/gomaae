import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db, getActiveProjectId } from '@/lib/db';
import { generateText } from '@/lib/ai/llm';

/**
 * POST /api/release/notes
 * Body: { since?: string (ISO date), version?: string }
 * Queries Done tickets (Epics, Stories, Tasks) optionally filtered by updated_at >= since,
 * then asks the LLM to write human-readable release notes in markdown.
 */
export async function POST(request: Request) {
  try {
    if (!getActiveProjectId()) {
      return NextResponse.json({ success: false, error: 'No active workstation.' }, { status: 400 });
    }

    const { since, version } = await request.json().catch(() => ({}));

    const sinceClause = since ? `AND updated_at >= ?` : '';
    const params: any[] = ['Done'];
    if (since) params.push(since);

    const rows = db.prepare(`
      SELECT tier, identifier, title, description, status, updated_at
      FROM tickets
      WHERE status = ? ${sinceClause}
        AND tier IN ('Epic', 'Story', 'Task')
      ORDER BY tier ASC, updated_at DESC
    `).all(...params) as any[];

    if (rows.length === 0) {
      return NextResponse.json({ success: true, notes: '_No completed tickets found for this period._' });
    }

    const byTier: Record<string, any[]> = { Epic: [], Story: [], Task: [] };
    rows.forEach(r => { (byTier[r.tier] ??= []).push(r); });

    const ticketSummary = [
      byTier.Epic.length  > 0 && `**Epics completed (${byTier.Epic.length}):**\n${byTier.Epic.map(t => `- [${t.identifier}] ${t.title}`).join('\n')}`,
      byTier.Story.length > 0 && `**Stories completed (${byTier.Story.length}):**\n${byTier.Story.map(t => `- [${t.identifier}] ${t.title}`).join('\n')}`,
      byTier.Task.length  > 0 && `**Tasks completed (${byTier.Task.length}):**\n${byTier.Task.map(t => `- [${t.identifier}] ${t.title}`).join('\n')}`,
    ].filter(Boolean).join('\n\n');

    const versionLabel = version ? `v${version.replace(/^v/, '')}` : 'this release';

    const prompt = `You are a technical writer for a developer productivity product called gomaae.
Generate clear, user-facing release notes for ${versionLabel} based on the completed tickets below.

Group changes under these headings (only include headings with content):
## ✨ New Features
## 🐛 Bug Fixes
## 🔧 Improvements
## 🏗️ Infrastructure

Rules:
- Write in plain English, not ticket IDs. Readers are developers and product managers.
- One bullet per meaningful change. Combine closely related tasks under one bullet.
- Skip purely internal refactors, version bumps, and CI housekeeping unless they affect users.
- Keep each bullet under 15 words.
- Do not mention ticket identifiers in the output.

Completed tickets:
${ticketSummary}

Return ONLY the markdown — no preamble, no trailing commentary.`;

    const notes = await generateText(prompt);

    return NextResponse.json({ success: true, notes: notes.trim(), count: rows.length });
  } catch (err: any) {
    console.error('[API release/notes]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
