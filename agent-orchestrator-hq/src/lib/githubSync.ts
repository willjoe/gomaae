import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Online sync between the local merge-review and GitHub pull requests.
 *
 * Local review works standalone. When a connected repo has a GitHub `origin`
 * (and the `gh` CLI is authenticated), each ticket review is mirrored to a real
 * PR: on In Review the ticket branch is pushed and a PR opened (one per changed
 * repo); on local Approve & Merge the PR is marked approved (a review comment) —
 * the actual GitHub merge is left to the human, by design.
 *
 * All GitHub access goes through the authenticated `gh` CLI (no stored token),
 * mirroring how the coding agents are CLI-driven.
 */
export interface TicketPR {
  repo: string;        // connected repo folder name (or the root repo's basename)
  number: number | null;
  url: string;
  state: string;       // OPEN | MERGED | CLOSED | APPROVED_LOCAL | ERROR
  message?: string;
}

const GH_TIMEOUT = 20000;

function gh(args: string[], cwd: string): string {
  return execFileSync('gh', args, { cwd, timeout: GH_TIMEOUT, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 8 * 1024 * 1024 }).toString();
}
function git(args: string[], cwd: string): string {
  return execFileSync('git', args, { cwd, timeout: GH_TIMEOUT, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 8 * 1024 * 1024 }).toString();
}

/** `gh` installed AND authenticated. */
export function githubReady(): boolean {
  try {
    execFileSync('gh', ['auth', 'status'], { timeout: 8000, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

const isGithubRemote = (url?: string) => !!url && /github\.com[:/]/.test(url);

/** Connected repos under Repository/ (single root or child folders) that have a GitHub origin. */
export function listGithubRepos(repositoryBase: string): { name: string; dir: string }[] {
  const out: { name: string; dir: string }[] = [];
  const consider = (name: string, dir: string) => {
    try {
      const url = git(['remote', 'get-url', 'origin'], dir).trim();
      if (isGithubRemote(url)) out.push({ name, dir });
    } catch { /* no origin */ }
  };
  if (!fs.existsSync(repositoryBase)) return out;
  if (fs.existsSync(path.join(repositoryBase, '.git'))) {
    consider(path.basename(repositoryBase), repositoryBase);
  } else {
    for (const f of fs.readdirSync(repositoryBase)) {
      const d = path.join(repositoryBase, f);
      if (fs.existsSync(path.join(d, '.git'))) consider(f, d);
    }
  }
  return out;
}

/** Connected GitHub repos that actually contain the given branch (=> "online" for it). */
export function githubReposWithBranch(repositoryBase: string, branch: string): { name: string; dir: string }[] {
  return listGithubRepos(repositoryBase).filter((r) => {
    try { git(['rev-parse', '--verify', branch], r.dir); return true; } catch { return false; }
  });
}

function defaultBranch(dir: string): string {
  try {
    return gh(['repo', 'view', '--json', 'defaultBranchRef', '-q', '.defaultBranchRef.name'], dir).trim() || 'main';
  } catch {
    return 'main';
  }
}

function branchHasCommits(dir: string, base: string, branch: string): boolean {
  try {
    const n = git(['rev-list', '--count', `${base}..${branch}`], dir).trim();
    return parseInt(n || '0', 10) > 0;
  } catch {
    return true; // can't tell — let gh decide (it refuses empty PRs)
  }
}

function findPR(dir: string, branch: string): TicketPR | null {
  try {
    const out = gh(['pr', 'view', branch, '--json', 'number,url,state'], dir);
    const d = JSON.parse(out);
    return { repo: '', number: d.number, url: d.url, state: d.state };
  } catch {
    return null;
  }
}

/**
 * Ensure a PR exists for the ticket branch in every connected GitHub repo that has
 * commits on it. Pushes the branch to GitHub first. Best-effort per repo.
 */
export function ensureTicketPRs(opts: {
  repositoryBase: string;
  branch: string;
  title: string;
  body: string;
}): TicketPR[] {
  const { repositoryBase, branch, title, body } = opts;
  const records: TicketPR[] = [];

  for (const repo of listGithubRepos(repositoryBase)) {
    // Only repos that actually have this branch locally (the agent pushed it here).
    try {
      git(['rev-parse', '--verify', branch], repo.dir);
    } catch {
      continue; // branch not in this repo
    }

    const base = defaultBranch(repo.dir);
    if (!branchHasCommits(repo.dir, base, branch)) continue;

    try {
      // Publish to GitHub.
      git(['push', '--force', 'origin', branch], repo.dir);

      // Reuse an existing PR or open a new one.
      let pr = findPR(repo.dir, branch);
      if (!pr) {
        const url = gh(['pr', 'create', '--head', branch, '--base', base, '--title', title, '--body', body], repo.dir).trim();
        const created = findPR(repo.dir, branch);
        pr = created || { repo: repo.name, number: null, url: url.split('\n').pop() || url, state: 'OPEN' };
      }
      records.push({ repo: repo.name, number: pr.number, url: pr.url, state: pr.state });
    } catch (e: any) {
      const msg = (e.stderr?.toString() || e.message || '').trim().slice(0, 200);
      records.push({ repo: repo.name, number: null, url: '', state: 'ERROR', message: msg });
    }
  }
  return records;
}

/**
 * Mirror a local review approval to the PRs. Per the chosen policy we do NOT merge
 * the PR on GitHub — we post an approval comment (GitHub blocks self-approval
 * reviews) and leave the merge button to the human.
 */
export function approveTicketPRs(repositoryBase: string, branch: string, approver: string): TicketPR[] {
  const records: TicketPR[] = [];
  for (const repo of listGithubRepos(repositoryBase)) {
    const pr = findPR(repo.dir, branch);
    if (!pr) continue;
    if (pr.state === 'MERGED' || pr.state === 'CLOSED') {
      records.push({ repo: repo.name, number: pr.number, url: pr.url, state: pr.state });
      continue;
    }
    try {
      gh(['pr', 'comment', branch, '--body', `✅ Approved in Gomaae local review by ${approver}. Ready to merge on GitHub.`], repo.dir);
      records.push({ repo: repo.name, number: pr.number, url: pr.url, state: 'APPROVED_LOCAL' });
    } catch (e: any) {
      records.push({ repo: repo.name, number: pr.number, url: pr.url, state: pr.state, message: (e.stderr?.toString() || e.message || '').slice(0, 200) });
    }
  }
  return records;
}

/** Refresh the live state of known PRs for a branch (OPEN/MERGED/CLOSED). */
export function refreshTicketPRs(repositoryBase: string, branch: string): TicketPR[] {
  const records: TicketPR[] = [];
  for (const repo of listGithubRepos(repositoryBase)) {
    const pr = findPR(repo.dir, branch);
    if (pr) records.push({ repo: repo.name, number: pr.number, url: pr.url, state: pr.state });
  }
  return records;
}

// --- persistence (db proxy injected to avoid an import cycle) ---

export function persistPRs(db: any, identifier: string, records: TicketPR[]): void {
  const up = db.prepare(`INSERT INTO ticket_prs (identifier, repo, number, url, state, message, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(identifier, repo) DO UPDATE SET
      number = excluded.number, url = excluded.url, state = excluded.state,
      message = excluded.message, updated_at = CURRENT_TIMESTAMP`);
  const tx = db.transaction((rows: TicketPR[]) => {
    for (const r of rows) up.run(identifier, r.repo, r.number ?? null, r.url || '', r.state, r.message || null);
  });
  tx(records);
}

export function readPRs(db: any, identifier: string): any[] {
  return db.prepare('SELECT repo, number, url, state, message FROM ticket_prs WHERE identifier = ? ORDER BY repo').all(identifier);
}
