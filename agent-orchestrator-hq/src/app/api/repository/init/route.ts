import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getActiveProjectRoot } from '@/lib/db';
import { simpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs';

/**
 * Initialize an empty git repository at Repository/ so the agent workspace
 * provisioner has a source to clone from. Idempotent — safe to call if a
 * repo already exists (returns success immediately).
 */
export async function POST() {
  try {
    const root = getActiveProjectRoot();
    if (!root) {
      return NextResponse.json({ success: false, error: 'No active workstation.' }, { status: 400 });
    }

    const repoPath = path.join(root, 'Repository');
    fs.mkdirSync(repoPath, { recursive: true });

    if (fs.existsSync(path.join(repoPath, '.git'))) {
      return NextResponse.json({ success: true, message: 'Repository already initialized.' });
    }

    const git = simpleGit(repoPath);
    await git.init();
    await git.raw(['-c', 'user.name=Gomaae', '-c', 'user.email=gomaae@local', 'commit', '--allow-empty', '-m', 'chore: init repository']);

    return NextResponse.json({ success: true, message: 'Repository initialized.' });
  } catch (error: any) {
    console.error('[API Repository Init] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
