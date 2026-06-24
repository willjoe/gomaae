import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getActiveProjectRoot } from '@/lib/db';
import { simpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs';

export async function POST(request: Request) {
  try {
    const { urls } = await request.json();
    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ success: false, error: 'Expected urls array' }, { status: 400 });
    }

    const root = getActiveProjectRoot();
    if (!root) {
      return NextResponse.json({ success: false, error: 'No active project' }, { status: 400 });
    }

    const repositoryBase = path.join(root, 'Repository');
    if (!fs.existsSync(repositoryBase)) {
      fs.mkdirSync(repositoryBase, { recursive: true });
    }

    const cloned: string[] = [];
    const errors: string[] = [];

    for (let url of urls) {
      url = url.trim();
      if (!url) continue;

      try {
        // Detect optional subdirectory suffix: https://github.com/org/repo.git/subdir
        // Everything after .git/ (or the last path segment after a bare repo URL) is the subdir.
        const subdirMatch = url.match(/^(.*\.git)\/(.+)$/);
        const gitUrl  = subdirMatch ? subdirMatch[1] : url;
        const subdir  = subdirMatch ? subdirMatch[2].replace(/\/+$/, '') : null;

        // Derive folder name: prefer subdir leaf name, fall back to repo name.
        const repoSegment = gitUrl.match(/\/([^/]+?)(?:\.git)?$/)?.[1] ?? `repo-${Date.now()}`;
        const repoName = subdir ? path.basename(subdir) : repoSegment;
        const targetDir = path.join(repositoryBase, repoName);

        if (fs.existsSync(path.join(targetDir, '.git'))) {
          cloned.push(`${repoName} (already cloned)`);
          continue;
        }

        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        const git = simpleGit();

        if (subdir) {
          // Sparse checkout: clone with blob filter, then materialise only the subdir.
          await git.clone(gitUrl, targetDir, ['--filter=blob:none', '--sparse', '--quiet']);
          await simpleGit(targetDir).raw(['sparse-checkout', 'set', subdir]);
        } else {
          await git.clone(gitUrl, targetDir, ['--quiet']);
        }

        cloned.push(repoName);
      } catch (err: any) {
        errors.push(`Failed to clone ${url}: ${err.message}`);
      }
    }

    if (errors.length > 0) {
       return NextResponse.json({ success: false, cloned, error: errors.join('; ') }, { status: 500 });
    }

    return NextResponse.json({ success: true, cloned });
  } catch (err: any) {
    console.error('[API Clone POST] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
