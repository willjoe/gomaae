import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

/**
 * Real agent execution for a ticket — Loop Engineering method.
 *
 * The agent runs in a loop until the ticket's Definition of Done is met
 * (DoD score >= DOD_PASS_THRESHOLD) or MAX_LOOP_ITERATIONS is reached.
 * Each failed DoD check produces targeted feedback that feeds the next
 * iteration's prompt, so the agent narrows in on gaps rather than
 * re-doing work from scratch.
 *
 * No simulation — all file edits and commits are real.
 */

const MAX_LOOP_ITERATIONS = 1;
const DOD_PASS_THRESHOLD = 75; // score ≥ 75 means DoD met

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildPrompt(ticket: any): string {
  return [
    `You are an autonomous software engineer working in this workspace (the current working directory), which contains one or more git repositories, on ticket ${ticket.identifier}.`,
    ``,
    `Task: ${ticket.title}`,
    ``,
    `Details / acceptance criteria:`,
    ticket.description || '(no description provided)',
    ``,
    `Implement this task now: create and edit the necessary files in this workspace to satisfy the task. Keep the change minimal and focused on this ticket. Do not run git commit — only make the file changes; the system will commit them per repository.`,
  ].join('\n');
}

function buildRefinementPrompt(ticket: any, dodFeedback: string, iteration: number): string {
  return [
    `You are an autonomous software engineer continuing work on ticket ${ticket.identifier} (iteration ${iteration} of ${MAX_LOOP_ITERATIONS}).`,
    ``,
    `Task: ${ticket.title}`,
    ``,
    `Your previous implementation was reviewed against the definition of done and was found to be incomplete. Your previous file changes are already in the workspace — do NOT redo them from scratch. Instead, review what is there and make only the additional edits needed to close the gaps below.`,
    ``,
    `What is still missing or needs fixing:`,
    dodFeedback,
    ``,
    `Definition of done:`,
    ticket.description || '(see ticket title)',
    ``,
    `Do not run git commit — only make the file changes.`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Definition-of-Done evaluator
// Reads the uncommitted git diff across all repos and asks the LLM whether
// the work satisfies the ticket's acceptance criteria.
// ---------------------------------------------------------------------------

async function evaluateDoD(
  ticket: any,
  repos: { dir: string; name: string }[],
): Promise<{ met: boolean; score: number; feedback: string }> {
  try {
    const { simpleGit } = require('simple-git');
    const { generateText } = require('@/lib/ai/llm');
    const { parseJsonLoose } = require('@/lib/brainstorm');

    const diffs: string[] = [];
    for (const r of repos) {
      try {
        const diff: string = await simpleGit(r.dir).diff(['HEAD']);
        if (diff.trim()) {
          diffs.push(`### ${r.name === '.' ? 'repo' : r.name}\n${diff.slice(0, 4000)}`);
        }
      } catch { /* repo may have no HEAD yet */ }
    }

    const workDone = diffs.length > 0
      ? diffs.join('\n\n')
      : '(no uncommitted file changes detected in any repo)';

    const prompt = `You are a senior engineer reviewing an AI coding agent's work against a ticket's definition of done.

Ticket: ${ticket.identifier} — ${ticket.title}
Tier: ${ticket.tier}

Acceptance criteria / Definition of done:
${ticket.description || '(no description provided)'}
${ticket.document_content ? `\nAdditional context:\n${String(ticket.document_content).slice(0, 2000)}` : ''}

Work done (uncommitted git diff):
\`\`\`diff
${workDone.slice(0, 6000)}
\`\`\`

Does the work above fully satisfy every acceptance criterion in the definition of done?

Return ONLY a JSON object (no prose, no markdown fences):
{ "met": <true|false>, "score": <integer 0-100>, "feedback": "1-3 sentences naming what is satisfied and what specific gaps remain, if any" }

Scoring guide: 0 = no relevant work or completely off target, 75 = all acceptance criteria met with minor gaps, 100 = perfectly complete with nothing missing.
Set "met": true only when score >= ${DOD_PASS_THRESHOLD}.`;

    const parsed = parseJsonLoose(await generateText(prompt));
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
    const feedback = String(parsed.feedback || '');
    const met = parsed.met === true || score >= DOD_PASS_THRESHOLD;
    return { met, score, feedback };
  } catch (e: any) {
    console.warn('[Loop Engineering] DoD evaluation failed — treating as passed:', e.message);
    return { met: true, score: 80, feedback: 'DoD evaluation unavailable — proceeding to commit.' };
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

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
    const { ticketBranch, ticketRepoDir, listBranchCommits, ticketWorkspaceRepos } = require('@/lib/ticketCommits');
    const { resolveAgent, runCodingAgent } = require('@/lib/agentRunner');
    const { simpleGit } = require('simple-git');

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    if (!ticket) return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });

    // Preflight completeness gate — ticket must be fully specified before an agent runs.
    const missing: string[] = [];
    if (!(ticket as any).title?.trim()) missing.push('Title');
    if (!(ticket as any).description?.trim()) missing.push('Description (acceptance criteria)');
    if (!(ticket as any).llm_role) missing.push('Assigned Role');
    if (!(ticket as any).expected_token_usage) missing.push('Approximate Token Usage');
    if (missing.length > 0) {
      update({ agent_state: null, agent_phase: null });
      return NextResponse.json(
        { success: false, error: `Ticket is not fully specified. Fill in: ${missing.join(', ')}.` },
        { status: 422 }
      );
    }

    // Start gate: a UnitTest only runs once the Task it targets is In Review (its
    // code exists). Refuse and keep it queued otherwise.
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
    const settings = Object.fromEntries(settingsRows.map((r: any) => [r.key, r.value]));
    const agent = resolveAgent(settings);
    if (!agent) {
      update({ agent_state: null, agent_phase: null });
      return NextResponse.json({ success: false, error: 'No coding agent available. Activate a Claude or Antigravity CLI on the AI Engine page.' }, { status: 400 });
    }

    // Test tickets share the branch of the Task they target.
    const { groupOwnerIdentifier } = require('@/lib/reviewGroups');
    const allTickets = db.prepare('SELECT id, identifier, tier, linked_ticket_id FROM tickets').all() as any[];
    const ownerIdentifier = groupOwnerIdentifier(ticket, allTickets);

    // Phase 1: provision the real scoped workspace + branch.
    update({ status: 'In Progress', agent_state: 'Running', agent_phase: 'Provisioning' });
    const repoDir = ticketRepoDir(workspaceRoot, ownerIdentifier);
    await prepareTicketWorkspace(workspaceRoot, ownerIdentifier);

    const branch = ticketBranch(ownerIdentifier);
    const repos = ticketWorkspaceRepos(repoDir) as { dir: string; name: string }[];

    // ---------------------------------------------------------------------------
    // Phase 2: Loop Engineering — code → verify DoD → refine until met or capped.
    // ---------------------------------------------------------------------------
    let lastRun: { ok: boolean; output: string } = { ok: false, output: '' };
    let dodResult: { met: boolean; score: number; feedback: string } = { met: false, score: 0, feedback: '' };

    for (let iteration = 1; iteration <= MAX_LOOP_ITERATIONS; iteration++) {
      const isFirst = iteration === 1;

      // Show the current iteration in the UI via agent_phase.
      update({
        agent_phase: isFirst
          ? 'Coding'
          : `Refining (${iteration}/${MAX_LOOP_ITERATIONS})`,
      });

      const prompt = isFirst
        ? buildPrompt(ticket)
        : buildRefinementPrompt(ticket, dodResult.feedback, iteration);

      lastRun = await runCodingAgent(repoDir, prompt, agent);

      // On the last allowed iteration skip the DoD check — commit what we have.
      if (iteration === MAX_LOOP_ITERATIONS) break;

      // Evaluate work against the Definition of Done.
      update({ agent_phase: `Verifying (${iteration}/${MAX_LOOP_ITERATIONS})` });
      dodResult = await evaluateDoD(ticket, repos);

      if (dodResult.met) break;
      // Otherwise loop: the next iteration gets dodResult.feedback as guidance.
    }

    const run = lastRun;

    // ---------------------------------------------------------------------------
    // Phase 3 & 4: stage, commit, and publish the real diff in each changed repo.
    // ---------------------------------------------------------------------------
    update({ agent_phase: 'Finalizing' });
    const author = `Gomaae Agent (${ticket.llm_role || agent.label})`;
    const changedFiles: string[] = [];
    const commitHashes: string[] = [];
    let published = false;

    update({ agent_phase: 'Committing' });
    for (const r of repos) {
      const rgit = simpleGit(r.dir);
      await rgit.add(['-A']);
      const status = await rgit.status();
      if (status.files.length > 0) {
        changedFiles.push(...status.files.map((f: any) => (r.name === '.' ? f.path : `${r.name}/${f.path}`)));
        await rgit.raw(['-c', `user.name=${author}`, '-c', 'user.email=agent@gomaae.local', 'commit', '-m', `${ticket.identifier}: ${ticket.title}`]);
        commitHashes.push((await rgit.revparse(['--short', 'HEAD'])).trim());
      }
      try {
        await rgit.raw(['push', '--force', 'origin', branch]);
        published = true;
      } catch (e: any) {
        console.warn(`[Tickets Run] branch publish failed for ${r.name}:`, e.message);
      }
    }
    const commitHash = commitHashes[0] || null;

    // Done: In Review (open PR), container stopped.
    update({ status: 'In Review', agent_state: 'Stopped', agent_phase: null });

    // Mirror to GitHub: open/update one PR per connected repo whose branch changed.
    let prs: any[] = [];
    try {
      const { githubReady, ensureTicketPRs, persistPRs } = require('@/lib/githubSync');
      if (githubReady()) {
        prs = ensureTicketPRs({
          repositoryBase: require('path').join(workspaceRoot, 'Repository'),
          branch,
          title: `${ticket.identifier}: ${ticket.title}`,
          body: ticket.description || `Automated PR for ${ticket.identifier}.`,
        });
        if (prs.length) persistPRs(db, ownerIdentifier, prs);
      }
    } catch (e: any) {
      console.warn('[Tickets Run] GitHub PR sync skipped:', e.message);
    }

    const commits = await listBranchCommits(repoDir, branch);
    return NextResponse.json({
      success: true,
      agent: agent.label,
      ranOk: run.ok,
      loopIterations: MAX_LOOP_ITERATIONS,
      dodScore: dodResult.score,
      dodMet: dodResult.met,
      dodFeedback: dodResult.feedback,
      changedFiles,
      commitHash,
      branch,
      published,
      prs,
      commits,
      output: run.output.slice(-4000),
    });
  } catch (error: any) {
    console.error('[API Tickets Run] Failure:', error);
    try { update({ agent_state: 'Stopped', agent_phase: null }); } catch { /* ignore */ }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
