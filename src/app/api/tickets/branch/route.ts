import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { db } = require('@/lib/db');
    const { BRANCH_OWNING_TIERS } = require('@/lib/branchRules');
    const { createBranchForTicket } = require('@/lib/branchOps');

    const { ticketId } = await request.json();
    if (!ticketId) return NextResponse.json({ success: false, error: 'ticketId is required' }, { status: 400 });

    const ticket = db.prepare('SELECT id, tier, title, git_branch FROM tickets WHERE id = ?').get(ticketId) as any;
    if (!ticket) return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
    if (!BRANCH_OWNING_TIERS.has(ticket.tier)) {
      return NextResponse.json({ success: false, error: `Tier "${ticket.tier}" does not own a branch.` }, { status: 400 });
    }

    createBranchForTicket(ticketId);

    const updated = db.prepare('SELECT git_branch FROM tickets WHERE id = ?').get(ticketId) as any;
    return NextResponse.json({ success: true, branch: updated?.git_branch });
  } catch (err: any) {
    console.error('[API Tickets Branch] Failure:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
