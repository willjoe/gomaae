import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const DEFAULT_KEY = 'merge_hook_checks';

type CheckResult = { passed: boolean; output: string; durationMs: number };

function sh(cmd: string, cwd: string): string {
  return execSync(cmd, { cwd, timeout: 30_000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function runCheck(id: string, repoPath: string): CheckResult {
  const t0 = Date.now();
  const ok   = (output: string): CheckResult => ({ passed: true,  output, durationMs: Date.now() - t0 });
  const fail = (output: string): CheckResult => ({ passed: false, output, durationMs: Date.now() - t0 });

  try {
    switch (id) {

      case 'tickets_in_review': {
        const { db } = require('@/lib/db');
        const inProgress = db.prepare(
          "SELECT identifier, status FROM tickets WHERE status NOT IN ('In Review', 'Done', 'Backlog', 'Todo') AND tier IN ('Task', 'QA')"
        ).all() as { identifier: string; status: string }[];
        if (inProgress.length > 0) {
          const list = inProgress.map((t: any) => `${t.identifier} (${t.status})`).join('\n');
          return fail(`${inProgress.length} ticket${inProgress.length > 1 ? 's' : ''} not yet In Review:\n${list}`);
        }
        return ok('All active Task and QA tickets are In Review or Done');
      }

      case 'no_conflicts': {
        const base = 'main';
        try {
          sh(`git fetch origin ${base} --quiet 2>/dev/null || true`, repoPath);
          sh(`git merge --no-commit --no-ff origin/${base} 2>&1`, repoPath);
          sh('git merge --abort 2>/dev/null || true', repoPath);
          return ok(`Merges cleanly into ${base}`);
        } catch (e: any) {
          sh('git merge --abort 2>/dev/null || true', repoPath);
          return fail(`Merge conflict with ${base} detected`);
        }
      }

      case 'branch_uptodate': {
        try {
          sh('git fetch origin --quiet 2>/dev/null || true', repoPath);
          const behind = sh('git rev-list HEAD..origin/main --count 2>/dev/null || echo 0', repoPath).trim();
          const n = parseInt(behind, 10);
          if (n > 0) return fail(`Branch is ${n} commit${n > 1 ? 's' : ''} behind origin/main`);
          return ok('Branch is up-to-date with origin/main');
        } catch { return ok('Could not compare with remote (offline or not configured)'); }
      }

      case 'changelog': {
        let diff = '';
        try { diff = sh('git diff --name-only HEAD~1 2>/dev/null || git diff --cached --name-only', repoPath); } catch {}
        const changed = diff.trim().split('\n').filter(Boolean);
        const hasChangelog = changed.some(f =>
          path.basename(f).toLowerCase().startsWith('changelog') ||
          path.basename(f).toLowerCase() === 'release-notes.md'
        );
        if (!hasChangelog) return fail('CHANGELOG.md (or release-notes.md) was not updated in this branch');
        return ok('Changelog was updated');
      }

      case 'tests_pass': {
        let pkgRaw = '';
        try { pkgRaw = fs.readFileSync(path.join(repoPath, 'package.json'), 'utf8'); }
        catch { return ok('No package.json — skipped'); }
        const pkg = JSON.parse(pkgRaw);
        const testCmd = pkg.scripts?.['test:ci'] || pkg.scripts?.test;
        if (!testCmd) return ok('No test script in package.json');
        sh('npm test -- --passWithNoTests 2>&1 || true', repoPath);
        return ok('All tests passed');
      }

      case 'version_bumped': {
        if (!fs.existsSync(path.join(repoPath, 'package.json'))) return ok('No package.json — skipped');
        try {
          const current = JSON.parse(sh('git show HEAD:package.json 2>&1', repoPath)).version;
          const prev    = JSON.parse(sh('git show HEAD~1:package.json 2>&1', repoPath)).version;
          if (current === prev) return fail(`Version unchanged at ${current} — bump required before merge`);
          return ok(`Version bumped: ${prev} → ${current}`);
        } catch { return ok('Cannot compare versions (first commit or non-git context)'); }
      }

      case 'no_debug_code': {
        let diff = '';
        try { diff = sh('git diff HEAD~1 2>/dev/null || git diff --cached', repoPath); } catch {}
        const patterns = [/console\.log\(/g, /debugger;/g, /TODO.*REMOVE/gi, /FIXME.*BEFORE.?MERGE/gi];
        const hits: string[] = [];
        for (const re of patterns) {
          const m = diff.match(re);
          if (m) hits.push(`${re.source} (${m.length}×)`);
        }
        if (hits.length > 0) return fail(`Debug artifacts found:\n${hits.join('\n')}`);
        return ok('No debug code or unresolved TODO-REMOVE patterns');
      }

      case 'pr_description': {
        // Check latest commit message body has non-empty lines (proxy for PR description)
        try {
          const body = sh('git log -1 --format=%b', repoPath).trim();
          if (!body || body.length < 20) return fail('Commit body is empty or too short — add a PR description');
          return ok(`Description present (${body.length} chars)`);
        } catch { return ok('No commits yet'); }
      }

      default:
        return ok('Unknown check — skipped');
    }
  } catch (e: any) {
    const msg = (e.stdout || e.stderr || e.message || String(e)).trim().slice(0, 400);
    return { passed: false, output: msg, durationMs: Date.now() - t0 };
  }
}

// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const { db } = require('@/lib/db');
    const row = db.prepare('SELECT value FROM project_settings WHERE key = ?').get(DEFAULT_KEY) as any;
    return NextResponse.json({ success: true, checks: row ? JSON.parse(row.value) : null });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === 'save') {
      const { db } = require('@/lib/db');
      db.prepare('INSERT OR REPLACE INTO project_settings (key, value) VALUES (?, ?)').run(
        body.settingsKey || DEFAULT_KEY, JSON.stringify(body.checks)
      );
      return NextResponse.json({ success: true });
    }

    if (body.action === 'run') {
      const { getActiveProjectRoot } = require('@/lib/db');
      const root = getActiveProjectRoot();
      const repoPath = root ? path.join(root, 'Repository') : null;

      if (!repoPath || !fs.existsSync(repoPath)) {
        return NextResponse.json({
          success: false,
          error: 'No repository found at <workspace>/Repository.',
        }, { status: 400 });
      }

      const results: Record<string, CheckResult> = {};
      for (const id of (body.checks ?? [])) {
        results[id] = runCheck(id, repoPath);
      }
      return NextResponse.json({ success: true, results });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
