import { simpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs';

/**
 * Per-ticket workspace provisioning, following the standardized ~/Agentic
 * hierarchy:  <workspaceRoot>/Workspaces/<TICKET>/repo  is a scoped clone of
 * <workspaceRoot>/Repository.
 *
 * This is the host-side "materialize a scoped sandbox" step: instead of mounting
 * the entire project workspace into the agent container (which would expose
 * Tickets/, DocsAssets/, Logs/, Config/ and other tickets), we hand the agent a
 * dedicated per-ticket clone. The canonical Repository is never mounted.
 *
 * `allowedPaths` (optional) further narrows the materialized tree via
 * sparse-checkout — the presentation boundary. Enforcement still happens at
 * commit time (diff-scope gate), once the ticket schema carries allowed_paths.
 */
export async function prepareTicketWorkspace(
  workspaceRoot: string,
  ticketIdentifier: string,
  allowedPaths?: string[],
): Promise<string> {
  const repository = path.join(workspaceRoot, 'Repository');
  if (!fs.existsSync(path.join(repository, '.git'))) {
    throw new Error(`Repository at ${repository} is not a git repository`);
  }

  const wsDir = path.join(workspaceRoot, 'Workspaces', ticketIdentifier);
  const repoDir = path.join(wsDir, 'repo');
  const branch = `ticket/${ticketIdentifier.toLowerCase()}`;

  // Idempotent: reuse an existing scoped clone across re-spawns.
  if (fs.existsSync(path.join(repoDir, '.git'))) return repoDir;

  fs.mkdirSync(wsDir, { recursive: true });
  await simpleGit().clone(repository, repoDir, ['--no-hardlinks', '--quiet']);

  const git = simpleGit(repoDir);
  // If the branch was already published (e.g. the Task already ran and this is a
  // test ticket joining the same branch), check it out tracking origin so the
  // existing commits are present. Otherwise start a fresh branch off the default.
  let remoteHasBranch = false;
  try {
    remoteHasBranch = (await git.branch(['-r'])).all.includes(`origin/${branch}`);
  } catch { /* no remotes / empty repo */ }
  if (remoteHasBranch) {
    await git.checkout(['-B', branch, `origin/${branch}`]);
  } else {
    await git.checkoutLocalBranch(branch);
  }

  const cones = (allowedPaths ?? [])
    .map((p) => p.replace(/\/\*\*$/, '').replace(/\/\*$/, ''))
    .filter((p) => p && !p.includes('*'));
  if (cones.length) {
    await git.raw(['sparse-checkout', 'init', '--cone']);
    await git.raw(['sparse-checkout', 'set', ...cones]);
  }

  fs.writeFileSync(
    path.join(wsDir, 'manifest.json'),
    JSON.stringify(
      { ticket: ticketIdentifier, branch, allowed_paths: allowedPaths ?? null, created_at: new Date().toISOString() },
      null,
      2,
    ) + '\n',
  );

  return repoDir;
}
