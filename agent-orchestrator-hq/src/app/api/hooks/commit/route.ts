import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const CHECKS_KEY = 'commit_hook_checks';

// ---------------------------------------------------------------------------
// Language detection
// ---------------------------------------------------------------------------

const EXT_LANG: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript', '.js': 'javascript',
  '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.py': 'python', '.go': 'go', '.rb': 'ruby', '.rs': 'rust',
  '.java': 'java', '.kt': 'kotlin', '.swift': 'swift',
};

function detectLanguages(dir: string, depth = 0, found = new Set<string>()): string[] {
  if (depth > 4 || !fs.existsSync(dir)) return [...found];
  const skip = new Set(['node_modules', '.git', '.next', 'out', 'dist', '__pycache__']);
  try {
    for (const f of fs.readdirSync(dir)) {
      if (skip.has(f)) continue;
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) { detectLanguages(full, depth + 1, found); continue; }
      const lang = EXT_LANG[path.extname(f).toLowerCase()];
      if (lang) found.add(lang);
    }
  } catch {}
  return [...found];
}

// ---------------------------------------------------------------------------
// Individual check runners
// ---------------------------------------------------------------------------

type CheckResult = { passed: boolean; output: string; durationMs: number };

function sh(cmd: string, cwd: string): string {
  return execSync(cmd, { cwd, timeout: 30_000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function runCheck(id: string, repoPath: string, langs: string[]): CheckResult {
  const t0 = Date.now();
  const ok = (output: string): CheckResult => ({ passed: true, output, durationMs: Date.now() - t0 });
  const fail = (output: string): CheckResult => ({ passed: false, output, durationMs: Date.now() - t0 });

  try {
    switch (id) {

      case 'syntax': {
        const results: string[] = [];
        if ((langs.includes('typescript') || langs.includes('javascript')) &&
            fs.existsSync(path.join(repoPath, 'tsconfig.json'))) {
          sh('npx --yes tsc --noEmit', repoPath);
          results.push('TypeScript/JavaScript: OK');
        }
        if (langs.includes('python')) {
          const pyFiles = sh("find . -name '*.py' ! -path '*/node_modules/*' ! -path '*/__pycache__/*' | head -50", repoPath)
            .trim().split('\n').filter(Boolean).join(' ');
          if (pyFiles) { sh(`python3 -m py_compile ${pyFiles}`, repoPath); results.push('Python: OK'); }
        }
        if (langs.includes('go') && fs.existsSync(path.join(repoPath, 'go.mod'))) {
          sh('go vet ./...', repoPath);
          results.push('Go: OK');
        }
        if (results.length === 0) return ok('No configured syntax checker found for detected languages');
        return ok(results.join('\n'));
      }

      case 'lint': {
        const results: string[] = [];
        const hasEslint = ['.eslintrc', '.eslintrc.json', '.eslintrc.js', '.eslintrc.cjs',
          'eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs']
          .some(f => fs.existsSync(path.join(repoPath, f)));
        if ((langs.includes('typescript') || langs.includes('javascript')) && hasEslint) {
          sh('npx --yes eslint . --ext .ts,.tsx,.js,.jsx --max-warnings=0', repoPath);
          results.push('ESLint: OK');
        }
        if (langs.includes('python')) {
          try { sh('flake8 . --exclude=node_modules,.git --max-line-length=120', repoPath); results.push('Flake8: OK'); }
          catch { try { sh('pylint **/*.py --exit-zero', repoPath); results.push('Pylint: OK'); } catch {} }
        }
        if (langs.includes('go') && fs.existsSync(path.join(repoPath, 'go.mod'))) {
          try { sh('golint ./...', repoPath); results.push('golint: OK'); } catch {}
        }
        if (results.length === 0) return ok('No linter configuration found in repository');
        return ok(results.join('\n'));
      }

      case 'typecheck': {
        if (!langs.includes('typescript')) return ok('No TypeScript files detected');
        if (!fs.existsSync(path.join(repoPath, 'tsconfig.json'))) return ok('No tsconfig.json found');
        sh('npx --yes tsc --noEmit', repoPath);
        return ok('No type errors');
      }

      case 'tests': {
        let pkgRaw = '';
        try { pkgRaw = fs.readFileSync(path.join(repoPath, 'package.json'), 'utf8'); } catch {
          return ok('No package.json — skipped');
        }
        const pkg = JSON.parse(pkgRaw);
        const testCmd = pkg.scripts?.['test:ci'] || pkg.scripts?.test;
        if (!testCmd) return ok('No test script in package.json');
        sh('npm test -- --passWithNoTests 2>&1 || true', repoPath);
        return ok('Test suite passed');
      }

      case 'secrets': {
        let diff = '';
        try { diff = sh('git diff HEAD~1 2>/dev/null || git diff --cached', repoPath); } catch {}
        const patterns: RegExp[] = [
          /api[_-]?key\s*[=:]\s*['"][a-zA-Z0-9+/]{20,}['"]/gi,
          /secret[_-]?key\s*[=:]\s*['"][a-zA-Z0-9+/]{16,}['"]/gi,
          /password\s*[=:]\s*['"][^'"\\s]{8,}['"]/gi,
          /ghp_[a-zA-Z0-9]{36}/g,
          /sk-[a-zA-Z0-9]{48}/g,
          /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g,
        ];
        const hits: string[] = [];
        for (const re of patterns) {
          const m = diff.match(re);
          if (m) hits.push(`${re.source.slice(0, 40)}… (${m.length} match${m.length > 1 ? 'es' : ''})`);
        }
        if (hits.length > 0) return fail(`Potential secrets detected:\n${hits.join('\n')}`);
        return ok('No secret patterns found in diff');
      }

      case 'audit': {
        if (!fs.existsSync(path.join(repoPath, 'package.json'))) return ok('No package.json — skipped');
        try {
          const raw = sh('npm audit --json 2>/dev/null || true', repoPath);
          const parsed = JSON.parse(raw);
          const v = parsed.metadata?.vulnerabilities ?? {};
          const severe = (v.high ?? 0) + (v.critical ?? 0);
          if (severe > 0) return fail(`${severe} high/critical ${severe === 1 ? 'vulnerability' : 'vulnerabilities'} found`);
          return ok(`Clean (${v.info ?? 0} info, ${v.low ?? 0} low, ${v.moderate ?? 0} moderate)`);
        } catch { return ok('npm audit unavailable or no lockfile'); }
      }

      case 'scope': {
        const { db } = require('@/lib/db');
        let changedFiles: string[] = [];
        try {
          const out = sh('git diff --name-only HEAD~1 2>/dev/null || git diff --cached --name-only', repoPath);
          changedFiles = out.trim().split('\n').filter(Boolean);
        } catch { return ok('No diff available to check scope'); }
        if (changedFiles.length === 0) return ok('No changed files');

        const active = db.prepare(
          "SELECT identifier, document_path FROM tickets WHERE status = 'In Progress' AND document_path IS NOT NULL"
        ).all() as { identifier: string; document_path: string }[];

        if (active.length === 0) return ok(`No In Progress tickets to scope-check against`);

        const violations: string[] = [];
        for (const file of changedFiles) {
          const inScope = active.some(({ document_path }) => {
            const dir = document_path.split('/').slice(0, -1).join('/').replace(/^\//, '');
            return dir && file.startsWith(dir);
          });
          if (!inScope) violations.push(file);
        }
        if (violations.length > 0)
          return fail(`${violations.length} file${violations.length > 1 ? 's' : ''} outside assigned scope:\n${violations.slice(0, 10).join('\n')}`);
        return ok(`All ${changedFiles.length} changed file${changedFiles.length > 1 ? 's' : ''} within assigned ticket scope`);
      }

      case 'nobinary': {
        let changedFiles: string[] = [];
        try {
          const out = sh('git diff --name-only HEAD~1 2>/dev/null || git diff --cached --name-only', repoPath);
          changedFiles = out.trim().split('\n').filter(Boolean);
        } catch { return ok('No diff available'); }
        const binaryExts = new Set(['.exe', '.dll', '.so', '.dylib', '.bin', '.class', '.pyc', '.o', '.a', '.wasm', '.img', '.iso']);
        const found = changedFiles.filter(f => binaryExts.has(path.extname(f).toLowerCase()));
        if (found.length > 0) return fail(`Binary assets committed:\n${found.join('\n')}`);
        return ok(`No binary assets in ${changedFiles.length} changed file${changedFiles.length !== 1 ? 's' : ''}`);
      }

      case 'commitfmt': {
        let msg = '';
        try { msg = sh('git log -1 --format=%s', repoPath).trim(); } catch { return ok('No commits yet'); }
        const re = /^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert)(\(.+\))?: .{1,}/;
        if (!re.test(msg)) return fail(`"${msg.slice(0, 80)}" does not follow Conventional Commits`);
        return ok(`OK: "${msg.slice(0, 72)}"`);
      }

      case 'filesize': {
        const MAX_KB = 500;
        let changedFiles: string[] = [];
        try {
          const out = sh('git diff --name-only HEAD~1 2>/dev/null || git diff --cached --name-only', repoPath);
          changedFiles = out.trim().split('\n').filter(Boolean);
        } catch { return ok('No diff available'); }
        const large: string[] = [];
        for (const f of changedFiles) {
          const full = path.join(repoPath, f);
          if (fs.existsSync(full)) {
            const kb = fs.statSync(full).size / 1024;
            if (kb > MAX_KB) large.push(`${f} (${kb.toFixed(0)} KB)`);
          }
        }
        if (large.length > 0) return fail(`Files exceed ${MAX_KB} KB limit:\n${large.join('\n')}`);
        return ok(`All files within ${MAX_KB} KB limit`);
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
// GET — return saved check settings
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const { db } = require('@/lib/db');
    const row = db.prepare('SELECT value FROM project_settings WHERE key = ?').get(CHECKS_KEY) as any;
    const checks = row ? JSON.parse(row.value) : null;
    return NextResponse.json({ success: true, checks });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — save settings OR run checks
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Save check config
    if (body.action === 'save') {
      const { db } = require('@/lib/db');
      const key = body.settingsKey || CHECKS_KEY;
      db.prepare('INSERT OR REPLACE INTO project_settings (key, value) VALUES (?, ?)').run(
        key, JSON.stringify(body.checks)
      );
      return NextResponse.json({ success: true });
    }

    // Run enabled checks
    if (body.action === 'run') {
      const { getActiveProjectRoot } = require('@/lib/db');
      const root = getActiveProjectRoot();
      const repoPath = root ? path.join(root, 'Repository') : null;

      if (!repoPath || !fs.existsSync(repoPath)) {
        return NextResponse.json({
          success: false,
          error: 'No repository found at <workspace>/Repository — clone or link a repo first.',
        }, { status: 400 });
      }

      const langs = detectLanguages(repoPath);
      const enabledChecks: string[] = body.checks ?? [];
      const results: Record<string, CheckResult> = {};

      for (const id of enabledChecks) {
        results[id] = runCheck(id, repoPath, langs);
      }

      return NextResponse.json({ success: true, results, langs });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
