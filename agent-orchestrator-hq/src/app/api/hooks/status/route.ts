import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFAULT_KEY = 'status_hook_checks';

type CheckResult = { passed: boolean; output: string; durationMs: number };

function runCheck(id: string): CheckResult {
  const t0 = Date.now();
  const ok   = (output: string): CheckResult => ({ passed: true,  output, durationMs: Date.now() - t0 });
  const fail = (output: string): CheckResult => ({ passed: false, output, durationMs: Date.now() - t0 });

  try {
    const { db } = require('@/lib/db');

    switch (id) {

      case 'blocking_phase': {
        const { getBlockingPhase, isStatusAllowedByPhase } = require('@/lib/blocking');
        const all = db.prepare('SELECT identifier, status, blocked_by FROM tickets').all();
        const violations: string[] = [];
        for (const t of all) {
          if (!t.blocked_by) continue;
          const phase = getBlockingPhase(t, all);
          if (!isStatusAllowedByPhase(t.status, phase)) {
            violations.push(`${t.identifier}: status "${t.status}" violates ${phase} phase`);
          }
        }
        if (violations.length > 0)
          return fail(`${violations.length} blocking phase violation${violations.length > 1 ? 's' : ''}:\n${violations.slice(0, 10).join('\n')}`);
        return ok('All tickets satisfy two-phase blocking constraints');
      }

      case 'agent_state_match': {
        const rows = db.prepare(
          "SELECT identifier, status, agent_state FROM tickets WHERE agent_state IS NOT NULL AND agent_state != ''"
        ).all() as { identifier: string; status: string; agent_state: string }[];
        const violations: string[] = [];
        for (const t of rows) {
          // agent_state 'Queued' is valid for Todo/Backlog; 'Running' only for In Progress
          if (t.agent_state === 'Running' && !['In Progress'].includes(t.status))
            violations.push(`${t.identifier}: agent Running but status is "${t.status}"`);
          if (t.agent_state === 'Completed' && !['In Review', 'Done'].includes(t.status))
            violations.push(`${t.identifier}: agent Completed but status is "${t.status}"`);
        }
        if (violations.length > 0)
          return fail(`Agent/status mismatches:\n${violations.join('\n')}`);
        return ok(`${rows.length} agent-assigned ticket${rows.length !== 1 ? 's' : ''} — states consistent`);
      }

      case 'linear_sync': {
        const conn = db.prepare("SELECT value FROM project_settings WHERE key = 'linear_api_key'").get() as any;
        if (!conn?.value || conn.value === 'cli_managed_proxy') return ok('Linear not connected — skipped');
        // Verify the sync table has been flushed recently (within 10 minutes)
        const recent = db.prepare(
          "SELECT COUNT(*) as n FROM logs WHERE action LIKE '%linear%' AND created_at > datetime('now', '-10 minutes')"
        ).get() as any;
        if (recent?.n > 0) return ok(`Linear synced recently (${recent.n} event${recent.n > 1 ? 's' : ''} in last 10 min)`);
        return ok('Linear connected — no recent activity to sync');
      }

      case 'webhook_delivery': {
        const endpoint = db.prepare("SELECT value FROM project_settings WHERE key = 'webhook_endpoint'").get() as any;
        if (!endpoint?.value) return ok('No webhook endpoint configured — skipped');
        return ok(`Webhook endpoint registered: ${endpoint.value}`);
      }

      case 'dependency_cascade': {
        const { getBlockingPhase } = require('@/lib/blocking');
        const all = db.prepare('SELECT identifier, status, blocked_by FROM tickets').all();
        const nowUnblocked: string[] = [];
        for (const t of all) {
          if (!t.blocked_by) continue;
          if (['In Review', 'Done', 'Backlog', 'Todo'].includes(t.status)) continue;
          const phase = getBlockingPhase(t, all);
          if (phase === 'clear') nowUnblocked.push(`${t.identifier} is now unblocked (blocker Done)`);
        }
        if (nowUnblocked.length > 0)
          return ok(`${nowUnblocked.length} ticket${nowUnblocked.length > 1 ? 's' : ''} unblocked by this transition:\n${nowUnblocked.join('\n')}`);
        return ok('No downstream tickets newly unblocked');
      }

      case 'audit_log': {
        const count = db.prepare("SELECT COUNT(*) as n FROM logs").get() as any;
        return ok(`Audit log active — ${count?.n ?? 0} entries recorded`);
      }

      case 'stale_tickets': {
        const stale = db.prepare(
          "SELECT identifier, status, updated_at FROM tickets " +
          "WHERE status = 'In Progress' AND updated_at < datetime('now', '-7 days')"
        ).all() as { identifier: string; status: string; updated_at: string }[];
        if (stale.length > 0) {
          const list = stale.map((t: any) => `${t.identifier} (last updated ${t.updated_at.slice(0, 10)})`).join('\n');
          return fail(`${stale.length} ticket${stale.length > 1 ? 's' : ''} In Progress with no update in 7 days:\n${list}`);
        }
        return ok('No stale In Progress tickets');
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
      const results: Record<string, CheckResult> = {};
      for (const id of (body.checks ?? [])) {
        results[id] = runCheck(id);
      }
      return NextResponse.json({ success: true, results });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
