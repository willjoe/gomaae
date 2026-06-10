import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { runSyncCycle } from '@/lib/sync-daemon';

/**
 * Run one bidirectional sync cycle for the active workstation: pull Linear changes
 * down (inbound) and push locally-created tickets up (outbound). Returns how many
 * tickets were pulled/pushed, or the reason it was skipped.
 */
export async function POST() {
  try {
    const result = await runSyncCycle();
    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, synced: result.synced, pushed: result.pushed ?? 0, skipped: result.skipped });
  } catch (error: any) {
    console.error('[API Linear Sync] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
