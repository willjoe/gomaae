import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

function weekLabel(date: Date): string {
  const y = date.getFullYear();
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  const m = String(start.getMonth() + 1).padStart(2, '0');
  const d = String(start.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export async function GET() {
  try {
    const { db, getActiveProjectId } = require('@/lib/db');
    if (!getActiveProjectId()) {
      return NextResponse.json({ success: true, empty: true });
    }

    const tickets: any[] = db.prepare('SELECT * FROM tickets').all();
    const scores: any[] = db.prepare('SELECT ticket_id, score FROM ticket_scores').all();

    const total = tickets.length;
    const now = new Date();

    // ── KPIs ─────────────────────────────────────────────────────────────────
    const done       = tickets.filter(t => t.status === 'Done').length;
    const inProgress = tickets.filter(t => t.status === 'In Progress').length;
    const inReview   = tickets.filter(t => t.status === 'In Review').length;
    const overdue    = tickets.filter(t =>
      t.due_datetime && new Date(t.due_datetime) < now && t.status !== 'Done'
    ).length;

    const scoreMap: Record<string, number> = {};
    scores.forEach(s => { scoreMap[s.ticket_id] = s.score; });
    const scoredTickets = tickets.filter(t => scoreMap[t.id] !== undefined);
    const avgScore = scoredTickets.length
      ? Math.round(scoredTickets.reduce((s, t) => s + scoreMap[t.id], 0) / scoredTickets.length)
      : null;

    const completionPct = total > 0 ? Math.round((done / total) * 100) : 0;

    // On schedule = ticket not overdue (due_datetime in future OR already Done)
    const withDue = tickets.filter(t => t.due_datetime);
    const onSchedule = withDue.filter(t =>
      t.status === 'Done' || new Date(t.due_datetime) >= now
    ).length;
    const onSchedulePct = withDue.length > 0 ? Math.round((onSchedule / withDue.length) * 100) : 100;

    // ── By Status ─────────────────────────────────────────────────────────────
    const statusOrder = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];
    const statusCounts: Record<string, number> = {};
    tickets.forEach(t => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1; });
    const byStatus = statusOrder
      .filter(s => statusCounts[s])
      .map(s => ({ status: s, count: statusCounts[s] }));

    // ── By Tier ───────────────────────────────────────────────────────────────
    const tierOrder = ['Epic', 'Operation', 'Story', 'Task', 'QA', 'UnitTest', 'Triage', 'Document'];
    const tierCounts: Record<string, { total: number; done: number }> = {};
    tickets.forEach(t => {
      if (!tierCounts[t.tier]) tierCounts[t.tier] = { total: 0, done: 0 };
      tierCounts[t.tier].total++;
      if (t.status === 'Done') tierCounts[t.tier].done++;
    });
    const byTier = tierOrder
      .filter(tr => tierCounts[tr])
      .map(tr => ({ tier: tr, total: tierCounts[tr].total, done: tierCounts[tr].done }));

    // ── Burndown (weekly) ─────────────────────────────────────────────────────
    // Approximate completion date for Done tickets using updated_at.
    const doneTickets = tickets.filter(t => t.status === 'Done' && t.updated_at);
    const dueDates = tickets.filter(t => t.due_datetime).map(t => new Date(t.due_datetime));
    const createdDates = tickets.filter(t => t.created_at).map(t => new Date(t.created_at));

    let startDate = createdDates.length ? new Date(Math.min(...createdDates.map(d => d.getTime()))) : now;
    let endDate   = dueDates.length   ? new Date(Math.max(...dueDates.map(d => d.getTime())))   : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Clamp: show at most 16 weeks each side of today
    const clampMs = 16 * 7 * 24 * 60 * 60 * 1000;
    if (now.getTime() - startDate.getTime() > clampMs) startDate = new Date(now.getTime() - clampMs);
    if (endDate.getTime() - now.getTime() > clampMs)   endDate   = new Date(now.getTime() + clampMs);

    // Snap startDate to Monday
    startDate.setDate(startDate.getDate() - startDate.getDay() + 1);
    startDate.setHours(0, 0, 0, 0);

    const totalWeeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const burndown: { date: string; label: string; ideal: number | null; actual: number | null }[] = [];

    for (let w = 0; w <= totalWeeks; w++) {
      const d = new Date(startDate.getTime() + w * 7 * 24 * 60 * 60 * 1000);
      const iso = d.toISOString();

      // Actual: remaining non-Done tickets up to this point in time
      const completedByDay = doneTickets.filter(t => new Date(t.updated_at) <= d).length;
      const actual = d <= now ? total - completedByDay : null;

      // Ideal: linear descent from total to 0 across the full window
      const ideal = Math.max(0, Math.round(total - (total * w) / totalWeeks));

      burndown.push({ date: iso, label: dateLabel(iso), ideal, actual });
    }

    // ── Weekly Velocity ───────────────────────────────────────────────────────
    const velocityMap: Record<string, number> = {};
    doneTickets.forEach(t => {
      const w = weekLabel(new Date(t.updated_at));
      velocityMap[w] = (velocityMap[w] || 0) + 1;
    });
    const velocityWeeks = Object.keys(velocityMap).sort().slice(-12);
    const velocity = velocityWeeks.map(w => ({
      week: w,
      label: dateLabel(w + 'T00:00:00'),
      completed: velocityMap[w],
    }));

    // ── Overdue Tickets ───────────────────────────────────────────────────────
    const overdueTickets = tickets
      .filter(t => t.due_datetime && new Date(t.due_datetime) < now && t.status !== 'Done')
      .sort((a, b) => new Date(a.due_datetime).getTime() - new Date(b.due_datetime).getTime())
      .slice(0, 10)
      .map(t => ({ id: t.id, identifier: t.identifier, title: t.title, tier: t.tier, due_datetime: t.due_datetime, status: t.status }));

    // ── Upcoming Tickets (due in next 14 days, not Done) ─────────────────────
    const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const upcomingTickets = tickets
      .filter(t => t.due_datetime && new Date(t.due_datetime) >= now && new Date(t.due_datetime) <= in14 && t.status !== 'Done')
      .sort((a, b) => new Date(a.due_datetime).getTime() - new Date(b.due_datetime).getTime())
      .slice(0, 10)
      .map(t => ({ id: t.id, identifier: t.identifier, title: t.title, tier: t.tier, due_datetime: t.due_datetime, llm_role: t.llm_role }));

    // ── Agent Activity ────────────────────────────────────────────────────────
    const agentActive = tickets.filter(t => t.agent_state && t.agent_state !== 'idle').length;
    const tokensUsed  = tickets.reduce((s: number, t: any) => s + (t.actual_token_usage || 0), 0);
    const tokensExp   = tickets.reduce((s: number, t: any) => s + (t.expected_token_usage || 0), 0);

    return NextResponse.json({
      success: true,
      kpis: { total, done, inProgress, inReview, overdue, avgScore, completionPct, onSchedulePct, agentActive, tokensUsed, tokensExp },
      byStatus,
      byTier,
      burndown,
      velocity,
      overdueTickets,
      upcomingTickets,
    });
  } catch (error: any) {
    console.error('[API Dashboard]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
