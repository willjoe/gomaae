/**
 * POST /api/tickets/reschedule
 *
 * Anchors all top-level Epics and Operations to a project start date and
 * cascades a waterfall schedule down through Stories → Tasks → QA.
 * Call once when you want to realign ticket dates to the real project timeline.
 */
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { scheduleEpicTree, nextDayAt9 } from '@/lib/epicDates';

export async function POST(request: Request) {
  try {
    const { db, getActiveProjectId } = require('@/lib/db');
    if (!getActiveProjectId()) {
      return NextResponse.json({ success: false, error: 'No active workspace.' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    // Default: project started June 5, 2026 (≈ 3 weeks before June 26 release anchor)
    const projectStart: string = body.projectStart ?? '2026-06-05T09:00:00';

    const topLevel = db.prepare(
      "SELECT id, tier FROM tickets WHERE parent_id IS NULL AND tier IN ('Epic', 'Operation') ORDER BY created_at ASC"
    ).all() as { id: string; tier: string }[];

    let currentStart = projectStart;
    let rescheduled = 0;

    const upd = db.prepare('UPDATE tickets SET start_datetime = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');

    for (const top of topLevel) {
      upd.run(currentStart, top.id);
      scheduleEpicTree(top.id); // cascades Story → Task → QA waterfall from currentStart

      const updated = db.prepare('SELECT due_datetime FROM tickets WHERE id = ?').get(top.id) as any;
      currentStart = updated?.due_datetime ? nextDayAt9(updated.due_datetime) : currentStart;
      rescheduled++;
    }

    return NextResponse.json({ success: true, rescheduled, projectStart });
  } catch (err: any) {
    console.error('[API tickets/reschedule]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
