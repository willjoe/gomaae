import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

/**
 * POST /api/tickets/complete-all
 *
 * One completion pass over every ticket in the active project.
 * Processes bottom-up so child tickets are completed before parents:
 *   UnitTest / QA  → Task  → Story  → Epic / Operation
 *
 * Rules per tier:
 *  QA / UnitTest : move to Done if parent Task is In Review or Done.
 *  Task          : if In Review → attempt merge (git branch); on failure or no
 *                  branch → force status to Done.  If not yet In Review →
 *                  advance directly (In Progress → In Review → Done) and close
 *                  any child QA tickets that are still open.
 *  Story         : move to Done once every child Task is Done.
 *  Epic/Operation: move to Done once every child Story is Done.
 *
 * Returns:
 *   { success, acted: [ { id, identifier, tier, action } ], remaining: number }
 *
 * Call this endpoint in a loop until remaining === 0.
 */
export async function POST() {
  try {
    const { db } = require('@/lib/db');

    const tickets: any[] = db.prepare('SELECT * FROM tickets').all();

    const byId = new Map<string, any>(tickets.map((t) => [t.id, t]));
    const childrenOf = new Map<string, any[]>();
    for (const t of tickets) {
      if (t.parent_id) {
        if (!childrenOf.has(t.parent_id)) childrenOf.set(t.parent_id, []);
        childrenOf.get(t.parent_id)!.push(t);
      }
    }

    const isDone = (t: any) => (t.status || '').toLowerCase() === 'done';
    const acted: { id: string; identifier: string; tier: string; action: string }[] = [];

    const patch = (id: string, fields: Record<string, any>) => {
      const keys = Object.keys(fields);
      db.prepare(
        `UPDATE tickets SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).run(...keys.map((k) => fields[k]), id);
    };

    // ── 1. QA / UnitTest ──────────────────────────────────────────────────────
    for (const t of tickets) {
      if (isDone(t)) continue;
      if (t.tier !== 'QA' && t.tier !== 'UnitTest') continue;

      const parent = t.parent_id ? byId.get(t.parent_id) : null;
      const parentOk = !parent || ['In Review', 'Done'].includes(parent.status || '');
      if (!parentOk) continue; // wait until parent task has work

      patch(t.id, { status: 'Done', agent_state: null, agent_phase: null });
      acted.push({ id: t.id, identifier: t.identifier, tier: t.tier, action: 'closed→Done' });
    }

    // Refresh map after QA patches
    const refreshedTickets: any[] = db.prepare('SELECT * FROM tickets').all();
    for (const t of refreshedTickets) byId.set(t.id, t);

    // ── 2. Tasks ──────────────────────────────────────────────────────────────
    for (const t of refreshedTickets) {
      if (isDone(t)) continue;
      if (t.tier !== 'Task') continue;

      const children = childrenOf.get(t.id) ?? [];
      const qaChildren = children.filter((c) => c.tier === 'QA' || c.tier === 'UnitTest');

      // Close any still-open QA children first.
      for (const qa of qaChildren) {
        if (!isDone(byId.get(qa.id) ?? qa)) {
          patch(qa.id, { status: 'Done', agent_state: null, agent_phase: null });
          acted.push({ id: qa.id, identifier: qa.identifier, tier: qa.tier, action: 'child-closed→Done' });
        }
      }

      const status = (t.status || '').toLowerCase();

      if (status === 'in review') {
        // Try a real git merge first; fall back to direct status update.
        let merged = false;
        try {
          const { ticketBranch, ticketRepoDir, ticketWorkspaceRepos } = require('@/lib/ticketCommits');
          const { getActiveProjectRoot } = require('@/lib/db');
          const { groupOwnerIdentifier, buildReviewGroups } = require('@/lib/reviewGroups');
          const { simpleGit } = require('simple-git');
          const path = require('path');
          const fs = require('fs');

          const workspaceRoot = getActiveProjectRoot();
          const allTickets = refreshedTickets;
          const ownerIdentifier = groupOwnerIdentifier(t, allTickets);
          const branch = ticketBranch(ownerIdentifier);
          const repoDir = ticketRepoDir(workspaceRoot, ownerIdentifier);

          const repos = ticketWorkspaceRepos(repoDir) as { dir: string; name: string }[];
          for (const r of repos) {
            if (!fs.existsSync(path.join(r.dir, '.git'))) continue;
            const git = simpleGit(r.dir);
            const branches = await git.branchLocal();
            if (!branches.all.includes(branch)) continue;
            try {
              await git.checkout('main').catch(() => git.checkout('master'));
              await git.merge([branch, '--no-ff', '-m', `Merge ${t.identifier}: ${t.title}`]);
              merged = true;
            } catch { /* branch may already be merged or have no commits */ }
          }
        } catch { /* non-fatal: fall through to direct patch */ }

        patch(t.id, { status: 'Done', agent_state: null, agent_phase: null });
        acted.push({ id: t.id, identifier: t.identifier, tier: 'Task', action: merged ? 'merged→Done' : 'forced→Done' });
      } else {
        // Not yet In Review — advance the task directly.
        patch(t.id, { status: 'Done', agent_state: null, agent_phase: null });
        acted.push({ id: t.id, identifier: t.identifier, tier: 'Task', action: `${status}→Done` });
      }
    }

    // Refresh again after Task patches.
    const afterTasks: any[] = db.prepare('SELECT * FROM tickets').all();
    for (const t of afterTasks) byId.set(t.id, t);

    // ── 3. Stories ────────────────────────────────────────────────────────────
    for (const t of afterTasks) {
      if (isDone(t)) continue;
      if (t.tier !== 'Story') continue;

      const tasks = (childrenOf.get(t.id) ?? []).filter((c) => c.tier === 'Task');
      const allTasksDone = tasks.length === 0 || tasks.every((c) => isDone(byId.get(c.id) ?? c));
      if (!allTasksDone) continue;

      patch(t.id, { status: 'Done' });
      acted.push({ id: t.id, identifier: t.identifier, tier: 'Story', action: '→Done' });
    }

    // Refresh after Story patches.
    const afterStories: any[] = db.prepare('SELECT * FROM tickets').all();
    for (const t of afterStories) byId.set(t.id, t);

    // ── 4. Epics / Operations ─────────────────────────────────────────────────
    for (const t of afterStories) {
      if (isDone(t)) continue;
      if (t.tier !== 'Epic' && t.tier !== 'Operation') continue;

      const stories = (childrenOf.get(t.id) ?? []).filter((c) => c.tier === 'Story');
      const allStoriesDone = stories.length === 0 || stories.every((c) => isDone(byId.get(c.id) ?? c));
      if (!allStoriesDone) continue;

      patch(t.id, { status: 'Done' });
      acted.push({ id: t.id, identifier: t.identifier, tier: t.tier, action: '→Done' });
    }

    // Count remaining after all passes.
    const final: any[] = db.prepare('SELECT status FROM tickets').all();
    const remaining = final.filter((t) => (t.status || '').toLowerCase() !== 'done').length;

    return NextResponse.json({ success: true, acted, remaining });
  } catch (error: any) {
    console.error('[API Tickets CompleteAll] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
