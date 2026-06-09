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

const isRepo = (dir: string) => fs.existsSync(path.join(dir, '.git'));

/** List the commits unique to the ticket's branch (the agent's real commits). */
export async function listBranchCommits(repoDir: string, branch: string): Promise<BranchCommit[]> {
  let repos: string[] = [];
  if (isRepo(repoDir)) {
    repos = [repoDir];
  } else if (fs.existsSync(repoDir)) {
    repos = fs.readdirSync(repoDir)
      .map(f => path.join(repoDir, f))
      .filter(p => fs.statSync(p).isDirectory() && isRepo(p));
  }

  const allCommits: BranchCommit[] = [];

  for (const repo of repos) {
    const git = simpleGit(repo);
    const fmt = '--format=%H%x1f%h%x1f%s%x1f%an%x1f%aI';

    let range = branch;
    try {
      const def = (await git.raw(['rev-parse', '--abbrev-ref', 'origin/HEAD'])).trim();
      if (def) range = `${def}..${branch}`;
    } catch { /* origin/HEAD may be unset */ }

    let raw = '';
    try {
      raw = await git.raw(['log', range, fmt]);
    } catch {
      try { raw = await git.raw(['log', branch, '-n', '20', fmt]); } catch { continue; }
    }

    const commits = raw
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [hash, short, message, author, date] = line.split('\x1f');
        return { hash, short, message, author, date };
      });
    
    allCommits.push(...commits);
  }

  // Sort aggregated commits by date descending
  return allCommits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
