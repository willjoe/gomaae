import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db, getActiveProjectId } from '@/lib/db';

/**
 * Disconnect Linear for the active workstation: removes the stored key, team id and
 * team name. Local tickets are left untouched (use a re-import to replace them).
 */
export async function DELETE() {
  try {
    if (!getActiveProjectId()) {
      return NextResponse.json({ success: false, error: 'No active workstation.' }, { status: 400 });
    }
    db.prepare("DELETE FROM project_settings WHERE key LIKE 'linear\\_%' ESCAPE '\\'").run();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Linear Connection DELETE] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
