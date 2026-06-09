import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

/**
 * Review approval = merge the branch's pull request. Test tickets share their
 * Task's branch, so a review group is all tickets on one branch. Approving merges
 * that single branch into the canonical Repository's default branch and moves
 * EVERY member of the group to Done (which unblocks dependents). Real git merge —
 * the work lands in Repository/.
 *
 * Guard: the branch must be "fulfilled" — every member In Review — before merge.
 */
export async function POST(request: Request) {
  try {
    const { db, getActiveProjectRoot } = require('@/lib/db');
    const { ticketBranch } = require('@/lib/ticketCommits');
    const { groupOwnerIdentifier, buildReviewGroups } = require('@/lib/reviewGroups');
    const { simpleGit } = require('simple-git');
    const path = require('path');
    const fs = require('fs');

    const { ticketId } = await request.json();
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    if (!ticket) return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });

    const allTickets = db.prepare('SELECT id, identifier, tier, status, linked_ticket_id FROM tickets').all() as any[];
    const ownerIdentifier = groupOwnerIdentifier(ticket, allTickets);
    const branch = ticketBranch(ownerIdentifier);
    const group = buildReviewGroups(allTickets).find((g: any) => g.branch === branch);
    const members = group ? group.tickets : [ticket];

    // Gate: refuse to merge until the whole branch is fulfilled (all In Review).
    if (group && !group.fulfilled) {
      const pending = group.pending.map((t: any) => `${t.identifier} (${t.status})`).join(', ');
      return NextResponse.json({
        success: false,
        error: `Branch ${branch} is not ready to merge. Awaiting: ${pending}.`,
      }, { status: 409 });
    }

    const workspaceRoot = getActiveProjectRoot();
    const repoPath = workspaceRoot ? path.join(workspaceRoot, 'Repository') : null;

    let merged = false;
    let mergeError: string | null = null;
    if (repoPath && fs.existsSync(path.join(repoPath, '.git'))) {
      const git = simpleGit(repoPath);
      try {
        // Verify the branch exists in the canonical Repository (published at In Review).
        const branches = await git.branchLocal();
        if (!branches.all.includes(branch)) {
          mergeError = `Branch ${branch} not found in Repository (run the agent first).`;
        } else {
          const def = (await git.raw(['rev-parse', '--abbrev-ref', 'HEAD'])).trim() || 'main';
          await git.raw(['checkout', def]);
          const memberList = members.map((m: any) => m.identifier).join(', ');
          await git.raw([
            '-c', 'user.name=HIAD Review', '-c', 'user.email=review@hiad.local',
            'merge', '--no-ff', branch, '-m', `Merge ${branch} (${memberList})`,
          ]);
          merged = true;
        }
      } catch (e: any) {
        mergeError = e.message;
      }
    } else {
      mergeError = 'Repository is not a git repository.';
    }

    // Approved -> every member Done (unblocks dependents). Agent containers cleared.
    const done = db.prepare("UPDATE tickets SET status = 'Done', agent_state = NULL, agent_phase = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    const tx = db.transaction((rows: any[]) => { for (const m of rows) done.run(m.id); });
    tx(members);

    return NextResponse.json({
      success: true,
      merged,
      branch,
      mergeError,
      completed: members.map((m: any) => m.identifier),
    });
  } catch (error: any) {
    console.error('[API Tickets Merge] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
