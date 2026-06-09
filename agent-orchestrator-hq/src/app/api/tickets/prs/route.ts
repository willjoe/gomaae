import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

/**
 * GitHub PRs synced from a ticket's local merge-review. Returns the stored rows
 * for the ticket's branch group (one per connected repo). `?refresh=true`
 * re-queries live PR state from GitHub via the gh CLI.
 */
export async function GET(request: Request) {
  try {
    const { db, getActiveProjectRoot } = require('@/lib/db');
    const { groupOwnerIdentifier } = require('@/lib/reviewGroups');
    const { ticketBranch } = require('@/lib/ticketCommits');
    const { githubReady, refreshTicketPRs, persistPRs, readPRs } = require('@/lib/githubSync');

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    const refresh = searchParams.get('refresh') === 'true';
    if (!ticketId) return NextResponse.json({ success: false, error: 'ticketId is required' }, { status: 400 });

    const ticket = db.prepare('SELECT id, identifier, tier, linked_ticket_id FROM tickets WHERE id = ?').get(ticketId);
    if (!ticket) return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });

    const allTickets = db.prepare('SELECT id, identifier, tier, linked_ticket_id FROM tickets').all() as any[];
    const ownerIdentifier = groupOwnerIdentifier(ticket, allTickets);

    let completed: string[] = [];
    if (refresh) {
      const root = getActiveProjectRoot();
      if (root && githubReady()) {
        const path = require('path');
        const live = refreshTicketPRs(path.join(root, 'Repository'), ticketBranch(ownerIdentifier));
        if (live.length) persistPRs(db, ownerIdentifier, live);
      }

      // Reconcile: once the platform reports every PR merged, local approval is
      // assumed — set the whole branch group to Done.
      const stored = readPRs(db, ownerIdentifier);
      if (stored.length > 0 && stored.every((p: any) => p.state === 'MERGED')) {
        const { buildReviewGroups } = require('@/lib/reviewGroups');
        const branch = ticketBranch(ownerIdentifier);
        const group = buildReviewGroups(allTickets).find((g: any) => g.branch === branch);
        const members = group ? group.tickets : [];
        const done = db.prepare("UPDATE tickets SET status = 'Done', agent_state = NULL, agent_phase = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status != 'Done'");
        const tx = db.transaction((rows: any[]) => { for (const m of rows) done.run(m.id); });
        tx(members);
        completed = members.map((m: any) => m.identifier);
      }
    }

    return NextResponse.json({ success: true, prs: readPRs(db, ownerIdentifier), completed });
  } catch (error: any) {
    console.error('[API Tickets PRs] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
