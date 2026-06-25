import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getActiveProjectRoot } from '@/lib/db'; // kept for backward-compat references
import { simpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs';

/**
 * Connected-repository management for a workstation's `Repository/` container.
 *
 * Multi-repo: `Repository/<name>` folders that each contain a `.git`.
 * Single-repo (legacy): a `.git` directly at `Repository/` — listed as one entry
 * that can't be renamed/deleted (it's the container itself) but whose remote can
 * still be edited.
 */
function repositoryBase(): string | null {
  const { getActiveRepoPath } = require('@/lib/db');
  return getActiveRepoPath();
}

/** Guard a user-supplied repo folder name to a direct child of base. */
function safeChildDir(base: string, name: string): string | null {
  if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) return null;
  const dir = path.join(base, name);
  if (path.dirname(path.resolve(dir)) !== path.resolve(base)) return null;
  return dir;
}

async function repoMeta(dir: string) {
  const git = simpleGit(dir);
  let remote = '';
  let branch = '';
  try {
    const remotes = await git.getRemotes(true);
    remote = remotes.find((r) => r.name === 'origin')?.refs?.fetch || remotes[0]?.refs?.fetch || '';
  } catch { /* no remotes */ }
  try {
    branch = (await git.revparse(['--abbrev-ref', 'HEAD'])).trim();
  } catch { /* unborn branch */ }
  return { remote, branch };
}

export async function GET() {
  try {
    const base = repositoryBase();
    if (!base || !fs.existsSync(base)) return NextResponse.json({ success: true, repos: [] });

    // Single repo living directly at Repository/.
    if (fs.existsSync(path.join(base, '.git'))) {
      const meta = await repoMeta(base);
      return NextResponse.json({
        success: true,
        repos: [{ name: path.basename(base), single: true, ...meta }],
      });
    }

    // Multi-repo: child folders with their own .git.
    const repos = [];
    for (const f of fs.readdirSync(base)) {
      const dir = path.join(base, f);
      if (fs.statSync(dir).isDirectory() && fs.existsSync(path.join(dir, '.git'))) {
        repos.push({ name: f, single: false, ...(await repoMeta(dir)) });
      }
    }
    return NextResponse.json({ success: true, repos });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const base = repositoryBase();
    if (!base) return NextResponse.json({ success: false, error: 'No active workstation' }, { status: 400 });
    const { name, newName, remote } = await request.json();

    const single = fs.existsSync(path.join(base, '.git')) && name === path.basename(base);
    const dir = single ? base : safeChildDir(base, name);
    if (!dir || !fs.existsSync(path.join(dir, '.git'))) {
      return NextResponse.json({ success: false, error: 'Repository not found' }, { status: 404 });
    }

    // Update the origin remote URL.
    if (typeof remote === 'string' && remote.trim()) {
      const git = simpleGit(dir);
      const remotes = await git.getRemotes();
      if (remotes.some((r) => r.name === 'origin')) await git.raw(['remote', 'set-url', 'origin', remote.trim()]);
      else await git.raw(['remote', 'add', 'origin', remote.trim()]);
    }

    // Rename the repo folder (multi-repo only).
    if (newName && newName !== name) {
      if (single) return NextResponse.json({ success: false, error: 'The root repository cannot be renamed.' }, { status: 400 });
      const target = safeChildDir(base, newName);
      if (!target) return NextResponse.json({ success: false, error: 'Invalid repository name' }, { status: 400 });
      if (fs.existsSync(target)) return NextResponse.json({ success: false, error: 'A repository with that name already exists' }, { status: 409 });
      fs.renameSync(dir, target);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const base = repositoryBase();
    if (!base) return NextResponse.json({ success: false, error: 'No active workstation' }, { status: 400 });
    const { name } = await request.json();

    if (fs.existsSync(path.join(base, '.git')) && name === path.basename(base)) {
      return NextResponse.json({ success: false, error: 'The root repository cannot be deleted from here.' }, { status: 400 });
    }
    const dir = safeChildDir(base, name);
    if (!dir || !fs.existsSync(path.join(dir, '.git'))) {
      return NextResponse.json({ success: false, error: 'Repository not found' }, { status: 404 });
    }
    fs.rmSync(dir, { recursive: true, force: true });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
