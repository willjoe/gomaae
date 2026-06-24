import { NextResponse } from 'next/server';
import { exec } from 'node:child_process';
export const dynamic = 'force-dynamic';

// Deployment targets + history persisted in project_settings.
// Target: { id, name, env, command?, webhookUrl?, lastDeployedAt?, lastStatus?, lastLog? }

function getDb() {
  const { db } = require('@/lib/db');
  return db;
}

function load<T>(db: any, key: string, fallback: T): T {
  const row = db.prepare('SELECT value FROM project_settings WHERE key = ?').get(key) as any;
  if (!row) return fallback;
  try { return JSON.parse(row.value) ?? fallback; } catch { return fallback; }
}

function save(db: any, key: string, value: unknown) {
  db.prepare(`
    INSERT INTO project_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, JSON.stringify(value));
}

export async function GET() {
  try {
    const db = getDb();
    return NextResponse.json({ targets: load(db, 'deployment_targets', []) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = getDb();

    // Delete
    if (body._delete) {
      const targets = (load(db, 'deployment_targets', []) as any[]).filter((t: any) => t.id !== body.id);
      save(db, 'deployment_targets', targets);
      return NextResponse.json({ targets });
    }

    // Trigger deployment
    if (body._trigger) {
      const targets: any[] = load(db, 'deployment_targets', []);
      const idx = targets.findIndex((t: any) => t.id === body.id);
      if (idx < 0) return NextResponse.json({ error: 'Target not found' }, { status: 404 });

      const target = targets[idx];
      const startedAt = new Date().toISOString();

      if (target.webhookUrl) {
        // Webhook deploy
        const res = await fetch(target.webhookUrl, { method: 'POST' });
        const ok = res.ok;
        targets[idx] = { ...target, lastDeployedAt: startedAt, lastStatus: ok ? 'success' : 'failure', lastLog: `Webhook → ${res.status} ${res.statusText}` };
        save(db, 'deployment_targets', targets);
        return NextResponse.json({ target: targets[idx] });
      }

      if (target.command) {
        // Shell command deploy — run async, update status when done
        const log = await new Promise<string>((resolve) => {
          exec(target.command, { timeout: 5 * 60 * 1000, cwd: process.env.HOME }, (err, stdout, stderr) => {
            resolve(err ? `ERROR: ${err.message}\n${stderr}`.trim() : (stdout || stderr || 'Done').trim());
          });
        });
        const success = !log.startsWith('ERROR:');
        targets[idx] = { ...target, lastDeployedAt: startedAt, lastStatus: success ? 'success' : 'failure', lastLog: log.slice(0, 2000) };
        save(db, 'deployment_targets', targets);
        return NextResponse.json({ target: targets[idx] });
      }

      return NextResponse.json({ error: 'Target has no command or webhook configured' }, { status: 400 });
    }

    // Upsert target
    const { id, name, env, command, webhookUrl, description } = body;
    if (!name || !env) return NextResponse.json({ error: 'name and env are required' }, { status: 400 });

    const targets: any[] = load(db, 'deployment_targets', []);
    const targetId = id || `dep_${Date.now()}`;
    const existing = targets.findIndex((t: any) => t.id === targetId);
    const target = { id: targetId, name, env, command: command || null, webhookUrl: webhookUrl || null, description: description || null };

    if (existing >= 0) targets[existing] = { ...targets[existing], ...target };
    else targets.push(target);

    save(db, 'deployment_targets', targets);
    return NextResponse.json({ target, targets });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
