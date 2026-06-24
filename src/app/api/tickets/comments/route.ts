import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from '@/lib/db';

/**
 * Comments for a ticket, filtered by ticket id. Attachments are returned as a
 * parsed array of { name, path, url } — `path` is relative to DocsAssets
 * (Files & Assets), under the `attachments/` folder.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    if (!ticketId) {
      return NextResponse.json({ success: false, error: 'ticketId is required' }, { status: 400 });
    }

    const rows = db.prepare(
      `SELECT id, ticket_id, author, body, attachments, source, created_at, updated_at
       FROM comments WHERE ticket_id = ? ORDER BY created_at ASC`
    ).all(ticketId) as any[];

    const comments = rows.map((r) => ({
      ...r,
      attachments: r.attachments ? JSON.parse(r.attachments) : [],
    }));

    return NextResponse.json({ success: true, comments });
  } catch (error: any) {
    console.error('[API Ticket Comments GET] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
