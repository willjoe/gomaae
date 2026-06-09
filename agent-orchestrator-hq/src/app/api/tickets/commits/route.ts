import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

/** List the commits on a ticket's dedicated branch (ticket/<identifier>). */
export async function GET(request: Request) {
  try {
    const { db, getActiveProjectRoot } = require('@/lib/db');
    const { ticketRepoDir, ticketBranch, listBranchCommits } = require('@/lib/ticketCommits');
    const { groupOwnerIdentifier } = require('@/lib/reviewGroups');

    const ticketId = new URL(request.url).searchParams.get('ticketId');
    if (!ticketId) return NextResponse.json({ success: false, error: 'ticketId is required' }, { status: 400 });

    const ticket = db.prepare('SELECT id, identifier, tier, linked_ticket_id FROM tickets WHERE id = ?').get(ticketId);
    if (!ticket) return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });

    // Commits live on the review group's shared branch (a test ticket's commits
    // are on its target Task's branch).
    const allTickets = db.prepare('SELECT id, identifier, tier, linked_ticket_id FROM tickets').all() as any[];
    const ownerIdentifier = groupOwnerIdentifier(ticket, allTickets);
    const branch = ticketBranch(ownerIdentifier);
    const workspaceRoot = getActiveProjectRoot();
    if (!workspaceRoot) return NextResponse.json({ success: true, branch, commits: [] });

    const commits = await listBranchCommits(ticketRepoDir(workspaceRoot, ownerIdentifier), branch);
    return NextResponse.json({ success: true, branch, commits });
  } catch (error: any) {
    console.error('[API Tickets Commits] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
