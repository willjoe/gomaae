import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db, getActiveProjectRoot } from '@/lib/db';
import { simpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs';

const SETTING_KEY = 'docs_source_url';

function getSetting(key: string): string | null {
  try { return (db.prepare('SELECT value FROM project_settings WHERE key = ?').get(key) as any)?.value ?? null; }
  catch { return null; }
}

function setSetting(key: string, value: string) {
  db.prepare(`INSERT INTO project_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, value);
}

function deleteSetting(key: string) {
  try { db.prepare('DELETE FROM project_settings WHERE key = ?').run(key); } catch { /* ignore */ }
}

/** Parse "https://host/org/repo.git/sub/dir" → { gitUrl, subdir }. */
function parseUrl(raw: string): { gitUrl: string; subdir: string | null } {
  const m = raw.match(/^(.*\.git)\/(.+)$/);
  return m ? { gitUrl: m[1], subdir: m[2].replace(/\/+$/, '') } : { gitUrl: raw, subdir: null };
}

/** Copy src tree into dest, creating dirs as needed. */
function copyDir(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

export async function GET() {
  try {
    const root = getActiveProjectRoot();
    if (!root) return NextResponse.json({ success: true, connected: false });
    const url = getSetting(SETTING_KEY);
    return NextResponse.json({ success: true, connected: !!url, url: url ?? null });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const root = getActiveProjectRoot();
    if (!root) return NextResponse.json({ success: false, error: 'No active workspace.' }, { status: 400 });

    const { url: rawUrl } = await request.json();
    if (!rawUrl) return NextResponse.json({ success: false, error: 'url is required.' }, { status: 400 });

    const { gitUrl, subdir } = parseUrl(rawUrl.trim());
    const sourceDir = path.join(root, '.docs-source');
    const docsDir   = root;

    // (Re-)clone with sparse checkout into the hidden .docs-source dir.
    if (fs.existsSync(sourceDir)) fs.rmSync(sourceDir, { recursive: true, force: true });
    fs.mkdirSync(sourceDir, { recursive: true });

    const git = simpleGit();
    if (subdir) {
      await git.clone(gitUrl, sourceDir, ['--filter=blob:none', '--sparse', '--quiet']);
      await simpleGit(sourceDir).raw(['sparse-checkout', 'set', subdir]);
    } else {
      await git.clone(gitUrl, sourceDir, ['--quiet']);
    }

    // Sync files into DocsAssets/.
    const syncSrc = subdir ? path.join(sourceDir, subdir) : sourceDir;
    if (!fs.existsSync(syncSrc)) {
      return NextResponse.json({ success: false, error: `Subdirectory "${subdir}" not found in the repository.` }, { status: 404 });
    }
    fs.mkdirSync(docsDir, { recursive: true });
    copyDir(syncSrc, docsDir);

    setSetting(SETTING_KEY, rawUrl.trim());
    return NextResponse.json({ success: true, synced: true });
  } catch (err: any) {
    console.error('[API Docs Connect POST]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH() {
  // Pull latest from remote and re-sync into DocsAssets/.
  try {
    const root = getActiveProjectRoot();
    if (!root) return NextResponse.json({ success: false, error: 'No active workspace.' }, { status: 400 });

    const rawUrl = getSetting(SETTING_KEY);
    if (!rawUrl) return NextResponse.json({ success: false, error: 'No source connected.' }, { status: 400 });

    const { subdir } = parseUrl(rawUrl);
    const sourceDir = path.join(root, '.docs-source');
    const docsDir   = root;

    if (!fs.existsSync(path.join(sourceDir, '.git'))) {
      return NextResponse.json({ success: false, error: 'Source clone missing — reconnect.' }, { status: 400 });
    }

    await simpleGit(sourceDir).pull();

    const syncSrc = subdir ? path.join(sourceDir, subdir) : sourceDir;
    if (!fs.existsSync(syncSrc)) {
      return NextResponse.json({ success: false, error: `Subdirectory "${subdir}" not found after pull.` }, { status: 404 });
    }
    copyDir(syncSrc, docsDir);

    return NextResponse.json({ success: true, synced: true });
  } catch (err: any) {
    console.error('[API Docs Connect PATCH]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    if (!getActiveProjectRoot()) return NextResponse.json({ success: false, error: 'No active workspace.' }, { status: 400 });
    deleteSetting(SETTING_KEY);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
