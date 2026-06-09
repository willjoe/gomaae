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

    // Online policy: if the branch is connected to GitHub, we must NOT merge locally
    // — the platform owns the merge (required reviews/checks). We point the user to
    // the PR; the ticket completes automatically once the platform reports it merged
    // (see /api/tickets/prs reconcile). Local merge is only for offline branches.
    let onlineRepos: any[] = [];
    try {
      const { githubReady, githubReposWithBranch } = require('@/lib/githubSync');
      if (repoPath && githubReady()) onlineRepos = githubReposWithBranch(repoPath, branch);
    } catch { /* gh unavailable */ }

    if (onlineRepos.length > 0) {
      let prs: any[] = [];
      try {
        const { refreshTicketPRs, persistPRs } = require('@/lib/githubSync');
        prs = refreshTicketPRs(repoPath, branch);
        if (prs.length) persistPRs(db, ownerIdentifier, prs);
      } catch { /* ignore */ }
      return NextResponse.json({
        success: true,
        online: true,
        merged: false,
        branch,
        prs,
        message: 'This branch is connected to GitHub — approve & merge it on the platform. The ticket completes automatically once the PR is merged.',
      });
    }

    // --- Offline branch: local merge-review owns the merge. ---
    let merged = false;
    let mergeError: string | null = null;
    if (repoPath && fs.existsSync(path.join(repoPath, '.git'))) {
      const git = simpleGit(repoPath);
      try {
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
      online: false,
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
