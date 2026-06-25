/**
 * Server-side git operations for ticket-driven branch management.
 * Called when a branch-owning ticket transitions to "In Progress".
 */

import { execFileSync } from 'child_process';
import { db, getActiveRepoPath } from './db';
import { branchName, BRANCH_OWNING_TIERS } from './branchRules';

function git(repoPath: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: repoPath, stdio: 'pipe', timeout: 15000 }).toString().trim();
}

function defaultBranch(repoPath: string): string {
  try {
    const sym = git(repoPath, 'symbolic-ref', 'refs/remotes/origin/HEAD', '--short');
    return sym.replace('origin/', '') || 'main';
  } catch {
    try { return git(repoPath, 'rev-parse', '--abbrev-ref', 'HEAD') || 'main'; }
    catch { return 'main'; }
  }
}

/**
 * Computes and creates the git branch for a ticket that just went "In Progress".
 * Idempotent: if git_branch is already set, this is a no-op.
 * Non-fatal: git errors are logged but do not block the status transition.
 */
export function createBranchForTicket(ticketId: string): void {
  const ticket = db.prepare('SELECT id, tier, title, parent_id, git_branch FROM tickets WHERE id = ?').get(ticketId) as any;
  if (!ticket || !BRANCH_OWNING_TIERS.has(ticket.tier) || ticket.git_branch) return;

  const newBranch = branchName(ticket.tier, ticket.title);

  const repoPath = getActiveRepoPath();
  if (!repoPath) {
    // No repo configured yet: store the branch name for future reference.
    db.prepare('UPDATE tickets SET git_branch = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newBranch, ticketId);
    return;
  }

  let baseBranch: string;
  if (ticket.tier === 'Epic' || ticket.tier === 'Operation') {
    baseBranch = defaultBranch(repoPath);
  } else {
    const parent = ticket.parent_id
      ? db.prepare('SELECT git_branch, title, tier FROM tickets WHERE id = ?').get(ticket.parent_id) as any
      : null;
    if (!parent) {
      db.prepare('UPDATE tickets SET git_branch = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newBranch, ticketId);
      return;
    }
    baseBranch = parent.git_branch || branchName(parent.tier, parent.title);
  }

  try {
    const existing = git(repoPath, 'branch', '--list', newBranch);
    if (!existing) {
      try { git(repoPath, 'fetch', '--quiet', 'origin', baseBranch); } catch {}
      try {
        git(repoPath, 'branch', newBranch, `origin/${baseBranch}`);
      } catch {
        try { git(repoPath, 'branch', newBranch, baseBranch); } catch {}
      }
      try { git(repoPath, 'push', '-u', 'origin', newBranch); } catch {}
    }
  } catch (e: any) {
    console.warn('[branchOps] git operation failed (non-fatal):', e.message);
  }

  db.prepare('UPDATE tickets SET git_branch = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newBranch, ticketId);
}
