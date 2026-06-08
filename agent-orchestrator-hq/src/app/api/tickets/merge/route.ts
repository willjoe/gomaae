import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

/**
 * Review approval = merge the pull request. Merges the ticket's branch
 * (ticket/<identifier>) into the canonical Repository's default branch and moves
 * the ticket to Done (which unblocks any dependents). Real git merge — the work
 * lands in Repository/.
 */
export async function POST(request: Request) {
  try {
    const { db, getActiveProjectRoot } = require('@/lib/db');
    const { ticketBranch } = require('@/lib/ticketCommits');
    const { simpleGit } = require('simple-git');
    const path = require('path');
    const fs = require('fs');

    const { ticketId } = await request.json();
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    if (!ticket) return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });

    const workspaceRoot = getActiveProjectRoot();
    const repoPath = workspaceRoot ? path.join(workspaceRoot, 'Repository') : null;
    const branch = ticketBranch(ticket.identifier);

    let merged = false;
    let mergeError: string | null = null;
    if (repoPath && fs.existsSync(path.join(repoPath, '.git'))) {
      const git = simpleGit(repoPath);
      try {
        // Verify the branch exists in the canonical Repository (was published at In Review).
        const branches = await git.branchLocal();
        if (!branches.all.includes(branch)) {
          mergeError = `Branch ${branch} not found in Repository (run the agent first).`;
        } else {
          const def = (await git.raw(['rev-parse', '--abbrev-ref', 'HEAD'])).trim() || 'main';
          await git.raw(['checkout', def]);
          await git.raw([
            '-c', 'user.name=HIAD Review', '-c', 'user.email=review@hiad.local',
            'merge', '--no-ff', branch, '-m', `Merge ${branch} (${ticket.identifier}): ${ticket.title}`,
          ]);
          merged = true;
        }
      } catch (e: any) {
        mergeError = e.message;
      }
    } else {
      mergeError = 'Repository is not a git repository.';
    }

    // Approved -> Done (unblocks dependents). Agent container cleared.
    db.prepare("UPDATE tickets SET status = 'Done', agent_state = NULL, agent_phase = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(ticketId);

    return NextResponse.json({ success: true, merged, branch, mergeError });
  } catch (error: any) {
    console.error('[API Tickets Merge] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
