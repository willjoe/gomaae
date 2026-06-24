import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { pushLocalTicketsToLinear } from '@/lib/sync-daemon';

/**
 * Push locally-created tickets (never synced) up to Linear via issueCreate, then
 * rebind them to their new Linear ids so they round-trip on the next inbound sync.
 */
export async function POST() {
  try {
    const result = await pushLocalTicketsToLinear();
    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, pushed: result.pushed, failed: result.failed });
  } catch (error: any) {
    console.error('[API Linear Push] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
