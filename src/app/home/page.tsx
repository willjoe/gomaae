'use client';

import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  LayoutDashboard, TrendingUp, CheckCircle2, Clock, AlertTriangle,
  Zap, Target, Bot, Coins, ArrowUpRight, Calendar, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useLifecycle } from '@/context/LifecycleContext';

// ── Colour palette ────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  'Backlog':     '#6b7280',
  'To Do':       '#3b82f6',
  'In Progress': '#f59e0b',
  'In Review':   '#8b5cf6',
  'Done':        '#10b981',
};
const TIER_COLORS: Record<string, string> = {
  Epic: '#6366f1', Operation: '#0ea5e9', Story: '#14b8a6',
  Task: '#f59e0b', QA: '#ef4444', UnitTest: '#ec4899',
  Triage: '#f97316', Document: '#6b7280',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
function daysAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d === 0) return 'today';
  if (d === 1) return '1d ago';
  return `${d}d ago`;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, color = 'blue', trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  const colorMap: Record<string, string> = {
    blue:   'bg-blue-500/10 text-blue-500 border-blue-500/20',
    green:  'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    amber:  'bg-amber-500/10 text-amber-500 border-amber-500/20',
    red:    'bg-red-500/10 text-red-500 border-red-500/20',
    violet: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
    slate:  'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className={cn('p-2 rounded-xl border', colorMap[color] || colorMap.blue)}>
          <Icon size={14} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-black tracking-tight text-foreground">{value}</span>
        {sub && <span className="text-xs text-muted-foreground mb-1">{sub}</span>}
      </div>
      {trend && (
        <div className={cn('flex items-center gap-1 text-[10px] font-bold',
          trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
        )}>
          <ArrowUpRight size={11} className={trend === 'down' ? 'rotate-180' : ''} />
          {trend === 'up' ? 'On track' : trend === 'down' ? 'Needs attention' : 'No change'}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">{title}</h2>
      {children}
    </div>
  );
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-card border border-border rounded-2xl p-5 flex flex-col gap-4', className)}>
      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{title}</span>
      {children}
    </div>
  );
}

// Custom tooltip styling
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-xl text-xs space-y-1">
      <p className="font-bold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-bold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { tickets } = useLifecycle();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      setData(json);
      setLastRefreshed(new Date());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        <RefreshCw size={16} className="animate-spin mr-2" /> Loading dashboard…
      </div>
    );
  }

  if (!data?.success || data?.empty) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
        <LayoutDashboard size={40} className="text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No project active. Create or select a project to see the dashboard.</p>
      </div>
    );
  }

  const { kpis, byStatus, byTier, burndown, velocity, overdueTickets, upcomingTickets } = data;

  const statusPieData = byStatus.map((s: any) => ({
    ...s, color: STATUS_COLORS[s.status] ?? '#6b7280',
  }));

  return (
    <div className="flex-1 overflow-y-auto bg-background custom-scrollbar">
      {/* Page header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500">
            <LayoutDashboard size={18} />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-foreground">Project Dashboard</h1>
            <p className="text-[10px] text-muted-foreground">
              {kpis.total} tickets · refreshed {lastRefreshed.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground border border-border rounded-xl hover:bg-muted/50 transition-all"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      <div className="p-8 space-y-8">

        {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
        <Section title="Key Metrics">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard label="Total Tickets"   value={kpis.total}         icon={Target}       color="blue"   />
            <StatCard label="Completed"        value={kpis.done}          icon={CheckCircle2} color="green"  sub={`${kpis.completionPct}%`} trend={kpis.completionPct >= 50 ? 'up' : 'neutral'} />
            <StatCard label="In Progress"      value={kpis.inProgress}    icon={TrendingUp}   color="amber"  />
            <StatCard label="In Review"        value={kpis.inReview}      icon={Clock}        color="violet" />
            <StatCard label="Overdue"          value={kpis.overdue}       icon={AlertTriangle} color={kpis.overdue > 0 ? 'red' : 'green'} trend={kpis.overdue > 0 ? 'down' : 'up'} />
            <StatCard label="Avg Score"        value={kpis.avgScore !== null ? `${kpis.avgScore}` : '—'} icon={Zap} color="violet" sub="/100" />
          </div>
        </Section>

        {/* ── Secondary KPI row ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="On Schedule"    value={`${kpis.onSchedulePct}%`}  icon={Calendar} color={kpis.onSchedulePct >= 80 ? 'green' : 'amber'} />
          <StatCard label="Active Agents"  value={kpis.agentActive}          icon={Bot}      color="blue" />
          <StatCard label="Tokens Used"    value={fmt(kpis.tokensUsed)}      icon={Coins}    color="slate" sub="actual" />
          <StatCard label="Tokens Budget"  value={fmt(kpis.tokensExp)}       icon={Coins}    color="slate" sub="expected" />
        </div>

        {/* ── Burndown + Status distribution ───────────────────────────────────── */}
        <Section title="Progress">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

            {/* Burndown (takes 2/3) */}
            <ChartCard title="Burndown — Remaining Tickets Over Time" className="xl:col-span-2">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={burndown} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,100,0.15)" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#6b7280' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} width={28} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                  <Line dataKey="ideal"  name="Ideal"  stroke="#6366f1" strokeWidth={1.5} strokeDasharray="5 3" dot={false} connectNulls />
                  <Line dataKey="actual" name="Actual" stroke="#10b981" strokeWidth={2}   dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-[9px] text-muted-foreground/60 italic">Actual uses Done ticket completion dates as a proxy. Ideal line assumes uniform delivery across the project window.</p>
            </ChartCard>

            {/* Status donut (takes 1/3) */}
            <ChartCard title="Tickets by Status">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {statusPieData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} formatter={(v: any, name: any, props: any) => [v, props.payload.status]} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="space-y-1.5">
                {statusPieData.map((s: any) => (
                  <div key={s.status} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="text-muted-foreground">{s.status}</span>
                    </div>
                    <span className="font-bold text-foreground">{s.count}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        </Section>

        {/* ── Tier breakdown + Velocity ─────────────────────────────────────────── */}
        <Section title="Breakdown">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {/* Tier breakdown */}
            <ChartCard title="Tickets by Tier — Total vs Done">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byTier} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,100,0.15)" vertical={false} />
                  <XAxis dataKey="tier" tick={{ fontSize: 9, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} width={24} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="total" name="Total" radius={[4, 4, 0, 0]} maxBarSize={32}>
                    {byTier.map((entry: any, i: number) => (
                      <Cell key={i} fill={TIER_COLORS[entry.tier] ?? '#6b7280'} opacity={0.4} />
                    ))}
                  </Bar>
                  <Bar dataKey="done" name="Done" radius={[4, 4, 0, 0]} maxBarSize={32}>
                    {byTier.map((entry: any, i: number) => (
                      <Cell key={i} fill={TIER_COLORS[entry.tier] ?? '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Weekly velocity */}
            <ChartCard title="Weekly Velocity — Tickets Completed">
              {velocity.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-xs text-muted-foreground">No completed tickets yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={velocity} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,100,0.15)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#6b7280' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} width={24} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </Section>

        {/* ── Overdue + Upcoming ────────────────────────────────────────────────── */}
        <Section title="Ticket Radar">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {/* Overdue */}
            <div className="bg-card border border-red-500/20 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={13} className="text-red-500" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-red-500">Overdue</span>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground">{kpis.overdue} tickets</span>
              </div>
              {overdueTickets.length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-muted-foreground">All tickets are on schedule.</div>
              ) : (
                <div className="divide-y divide-border">
                  {overdueTickets.map((t: any) => (
                    <div key={t.id} className="px-5 py-3 flex items-center gap-3 hover:bg-red-500/5 transition-colors">
                      <span className={cn(
                        'shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full',
                        TIER_COLORS[t.tier] ? '' : 'bg-muted text-muted-foreground'
                      )} style={{ background: (TIER_COLORS[t.tier] ?? '#6b7280') + '22', color: TIER_COLORS[t.tier] ?? '#6b7280' }}>
                        {t.tier}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{t.title}</p>
                        <p className="text-[9px] text-muted-foreground">{t.identifier}</p>
                      </div>
                      <span className="shrink-0 text-[9px] font-bold text-red-500">{daysAgo(t.due_datetime)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-blue-500" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-blue-500">Due Next 14 Days</span>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground">{upcomingTickets.length} tickets</span>
              </div>
              {upcomingTickets.length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-muted-foreground">Nothing due in the next 14 days.</div>
              ) : (
                <div className="divide-y divide-border">
                  {upcomingTickets.map((t: any) => {
                    const daysLeft = Math.ceil((new Date(t.due_datetime).getTime() - Date.now()) / 86_400_000);
                    return (
                      <div key={t.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                        <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: (TIER_COLORS[t.tier] ?? '#6b7280') + '22', color: TIER_COLORS[t.tier] ?? '#6b7280' }}>
                          {t.tier}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{t.title}</p>
                          <p className="text-[9px] text-muted-foreground">{t.identifier} {t.llm_role ? `· ${t.llm_role}` : ''}</p>
                        </div>
                        <span className={cn('shrink-0 text-[9px] font-bold', daysLeft <= 3 ? 'text-amber-500' : 'text-muted-foreground')}>
                          {daysLeft}d left
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Section>

      </div>
    </div>
  );
}
