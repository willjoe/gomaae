import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db, getActiveProjectId } from '@/lib/db';
import { scoreBriefFile, BRIEFS_RELATIVE_PREFIX, BRIEF_FILE_MAP } from '@/lib/initiative-scoring';
import { getActiveWorkstation } from '@/lib/appConfig';
import { hashContent } from '@/lib/hash';
import path from 'path';
import fs from 'fs';

const ALL_BRIEF_FILES = [
  'Problem Definition.md',
  'Customer & Market.md',
  'Unique Value Proposition.md',
  'Market Entry.md',
  'Feasibility.md',
  'Business Value.md',
  'Target Persona.md',
  'Iconic Scene.md',
  'MVP Guardrails.md',
  'Success Metric.md',
  'Cultural Fit - Team & Values.md',
  'Cultural Fit - Organizational Fit.md',
];

/**
 * POST /api/initiative/score-missing
 * Fires scoreBriefFile for every brief that has content on disk.
 * scoreBriefFile skips files whose content hash hasn't changed, so this is
 * safe to call on every page load — it only does LLM work when needed.
 */
export async function POST() {
  try {
    if (!getActiveProjectId()) {
      return NextResponse.json({ success: false, error: 'No active workstation.' }, { status: 400 });
    }

    const ws = getActiveWorkstation();
    if (!ws) return NextResponse.json({ success: false, error: 'No active workstation.' }, { status: 400 });

    let triggered = 0;
    for (const filename of ALL_BRIEF_FILES) {
      const filePath = path.join(ws.path, BRIEFS_RELATIVE_PREFIX, filename);
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf8').replace(/^#\s+.*\n/, '').trim();
      if (content.length <= 10) continue;

      // Skip files whose content hash already matches the stored score — same dedup
      // that scoreBriefFile does internally — so `triggered` reflects genuine new work.
      const mapping = BRIEF_FILE_MAP[filename];
      if (mapping) {
        const hash = hashContent(content);
        try {
          const row = db.prepare('SELECT content_hash FROM pillar_scores WHERE pillar = ?').get(mapping.pillar) as any;
          if (row?.content_hash === hash) continue;
        } catch { /* table not yet created — fall through */ }
      }

      scoreBriefFile(filename).catch((e) =>
        console.error(`[score-missing] "${filename}":`, e)
      );
      triggered++;
    }

    return NextResponse.json({ success: true, triggered });
  } catch (err: any) {
    console.error('[API initiative/score-missing]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
