import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

/**
 * Real agent execution for a ticket. No simulation: this provisions the ticket's
 * scoped workspace, runs the configured coding agent (Claude/Gemini CLI) which
 * actually edits files, then commits the real diff on the ticket's branch and
 * moves the ticket to In Review. `agent_phase` reflects the true current phase.
 */
function buildPrompt(ticket: any): string {
  return [
    `You are an autonomous software engineer working in this git repository (the current working directory) on ticket ${ticket.identifier}.`,
    ``,
    `Task: ${ticket.title}`,
    ``,
    `Details / acceptance criteria:`,
    ticket.description || '(no description provided)',
    ``,
    `Implement this task now: create and edit the necessary files in this repository to satisfy the task. Keep the change minimal and focused on this ticket. Do not run git commit — only make the file changes; the system will commit them.`,
  ].join('\n');
}

export async function POST(request: Request) {
  const { db, getActiveProjectRoot } = require('@/lib/db');
  const { ticketId } = await request.json();

  const update = (sets: Record<string, any>) => {
    const keys = Object.keys(sets);
    db.prepare(`UPDATE tickets SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(...keys.map((k) => sets[k]), ticketId);
  };

  try {
    const { prepareTicketWorkspace } = require('@/lib/workspace');
    const { ticketBranch, ticketRepoDir, listBranchCommits } = require('@/lib/ticketCommits');
    const { resolveAgent, runCodingAgent } = require('@/lib/agentRunner');
    const { simpleGit } = require('simple-git');

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    if (!ticket) return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });

    // Start gate: a UnitTest only runs once the Task it targets is In Review (its
    // code exists). Refuse and keep it queued otherwise — never run against a task
    // that hasn't produced reviewable code yet.
    if (ticket.tier === 'UnitTest') {
      const { getUnitTestTarget, isStartGateSatisfied } = require('@/lib/blocking');
      const allTickets = db.prepare('SELECT id, identifier, status FROM tickets').all() as any[];
      if (!isStartGateSatisfied(ticket, allTickets)) {
        const target = getUnitTestTarget(ticket, allTickets);
        update({ status: 'To Do', agent_state: 'Queued', agent_phase: null });
        return NextResponse.json({
          success: false,
          error: target
            ? `Target ${target.identifier} is ${target.status}; a unit test can only run once it is In Review.`
            : 'The task this unit test targets does not exist yet.',
        }, { status: 409 });
      }
    }

    const workspaceRoot = getActiveProjectRoot();
    if (!workspaceRoot) return NextResponse.json({ success: false, error: 'No active workstation' }, { status: 400 });

    const settingsRows = db.prepare('SELECT key, value FROM project_settings').all() as any[];
    const settings = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]));
    const agent = resolveAgent(settings);
    if (!agent) {
      update({ agent_state: null, agent_phase: null });
      return NextResponse.json({ success: false, error: 'No coding agent available. Activate a Claude or Gemini CLI on the AI Engine page.' }, { status: 400 });
    }

    // Test tickets (QA/UnitTest) are written on the SAME branch as the Task they
    // target — there is no separate branch/merge for them. Resolve the branch
    // owner so the agent commits onto the task's branch.
    const { groupOwnerIdentifier } = require('@/lib/reviewGroups');
    const allTickets = db.prepare('SELECT id, identifier, tier, linked_ticket_id FROM tickets').all() as any[];
    const ownerIdentifier = groupOwnerIdentifier(ticket, allTickets);

    // Phase 1: provision the real scoped workspace + branch (the owner's branch).
    update({ status: 'In Progress', agent_state: 'Running', agent_phase: 'Provisioning' });
    const repoDir = ticketRepoDir(workspaceRoot, ownerIdentifier);
    await prepareTicketWorkspace(workspaceRoot, ownerIdentifier);
    const git = simpleGit(repoDir);

    // Phase 2: the agent actually does the work (edits files in repoDir).
    update({ agent_phase: 'Coding' });
    const run = await runCodingAgent(repoDir, buildPrompt(ticket), agent);

    // Phase 3: stage the real changes.
    update({ agent_phase: 'Finalizing' });
    await git.add(['-A']);
    const status = await git.status();
    const changedFiles = status.files.map((f: any) => f.path);

    // Phase 4: commit the real diff (only if there are changes).
    update({ agent_phase: 'Committing' });
    const branch = ticketBranch(ownerIdentifier);
    let commitHash: string | null = null;
    if (changedFiles.length > 0) {
      const author = `HIAD Agent (${ticket.llm_role || agent.label})`;
      await git.raw(['-c', `user.name=${author}`, '-c', 'user.email=agent@hiad.local', 'commit', '-m', `${ticket.identifier}: ${ticket.title}`]);
      commitHash = (await git.revparse(['--short', 'HEAD'])).trim();
    }

    // Publish the branch to the canonical Repository so "In Review" behaves like an
    // open pull request — the branch is real in Repository/ and diffable against main.
    let published = false;
    try {
      await git.raw(['push', '--force', 'origin', branch]);
      published = true;
    } catch (e: any) {
      console.warn('[Tickets Run] branch publish failed:', e.message);
    }

    // Done: In Review (open PR), container stopped.
    update({ status: 'In Review', agent_state: 'Stopped', agent_phase: null });

    const commits = await listBranchCommits(repoDir, branch);
    return NextResponse.json({
      success: true,
      agent: agent.label,
      ranOk: run.ok,
      changedFiles,
      commitHash,
      branch,
      published,
      commits,
      output: run.output.slice(-4000),
    });
  } catch (error: any) {
    console.error('[API Tickets Run] Failure:', error);
    try { update({ agent_state: 'Stopped', agent_phase: null }); } catch { /* ignore */ }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
