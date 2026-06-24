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
  const repositoryBase = path.join(workspaceRoot, 'Repository');
  if (!fs.existsSync(repositoryBase)) {
    throw new Error(`Repository base directory at ${repositoryBase} does not exist`);
  }

  const wsDir = path.join(workspaceRoot, 'Workspaces', ticketIdentifier);
  const repoDir = path.join(wsDir, 'repo');
  const branch = `ticket/${ticketIdentifier.toLowerCase()}`;

  fs.mkdirSync(repoDir, { recursive: true });

  // Handle multi-repo or single-repo dynamically
  let repoFolders: string[] = [];
  if (fs.existsSync(path.join(repositoryBase, '.git'))) {
    // Single repo at root of Repository/
    repoFolders = ['.'];
  } else {
    // Multi-repo: find child folders that contain .git
    repoFolders = fs.readdirSync(repositoryBase).filter(f => 
      fs.statSync(path.join(repositoryBase, f)).isDirectory() && 
      fs.existsSync(path.join(repositoryBase, f, '.git'))
    );
  }

  for (const folder of repoFolders) {
    const sourceRepo = folder === '.' ? repositoryBase : path.join(repositoryBase, folder);
    const targetRepo = folder === '.' ? repoDir : path.join(repoDir, folder);
    
    // Idempotent: reuse an existing scoped clone
    if (fs.existsSync(path.join(targetRepo, '.git'))) continue;

    fs.mkdirSync(targetRepo, { recursive: true });
    await simpleGit().clone(sourceRepo, targetRepo, ['--no-hardlinks', '--quiet']);

    const git = simpleGit(targetRepo);
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
