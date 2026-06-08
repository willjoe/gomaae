import { simpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs';

/**
 * Per-ticket git commit linkage. Each task is worked on its own dedicated branch
 * (`ticket/<identifier>`) inside its scoped workspace clone
 * (`<workspaceRoot>/Workspaces/<identifier>/repo`). The commits on that branch
 * ARE the ticket's commits — we attach them by reading the branch log.
 */
export interface BranchCommit {
  hash: string;
  short: string;
  message: string;
  author: string;
  date: string;
}

export const ticketBranch = (identifier: string) => `ticket/${identifier.toLowerCase()}`;
export const ticketRepoDir = (workspaceRoot: string, identifier: string) =>
  path.join(workspaceRoot, 'Workspaces', identifier, 'repo');

const isRepo = (repoDir: string) => fs.existsSync(path.join(repoDir, '.git'));

/** List the commits unique to the ticket's branch (the agent's real commits). */
export async function listBranchCommits(repoDir: string, branch: string): Promise<BranchCommit[]> {
  if (!isRepo(repoDir)) return [];
  const git = simpleGit(repoDir);
  const fmt = '--format=%H%x1f%h%x1f%s%x1f%an%x1f%aI';

  // Prefer commits ahead of the cloned default branch; fall back to recent log.
  let range = branch;
  try {
    const def = (await git.raw(['rev-parse', '--abbrev-ref', 'origin/HEAD'])).trim(); // e.g. "origin/main"
    if (def) range = `${def}..${branch}`;
  } catch { /* origin/HEAD may be unset */ }

  let raw = '';
  try {
    raw = await git.raw(['log', range, fmt]);
  } catch {
    try { raw = await git.raw(['log', branch, '-n', '20', fmt]); } catch { return []; }
  }

  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, short, message, author, date] = line.split('\x1f');
      return { hash, short, message, author, date };
    });
}
