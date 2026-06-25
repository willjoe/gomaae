import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';
export const dynamic = 'force-dynamic';

export interface GraphCommit {
  hash: string;
  short: string;
  parents: string[];
  refs: string[];
  message: string;
  author: string;
  date: string;
  lane: number;
  color: string;
  aiModel?: string;
}

const LANE_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

function assignLanes(commits: Omit<GraphCommit, 'lane' | 'color'>[]): GraphCommit[] {
  const lanes: (string | null)[] = [];
  const result: GraphCommit[] = [];

  for (const c of commits) {
    let lane = lanes.indexOf(c.hash);

    if (lane === -1) {
      lane = lanes.indexOf(null);
      if (lane === -1) { lane = lanes.length; lanes.push(null); }
    }

    result.push({ ...c, lane, color: LANE_COLORS[lane % LANE_COLORS.length] });

    lanes[lane] = c.parents[0] ?? null;

    for (let i = 1; i < c.parents.length; i++) {
      const p = c.parents[i];
      if (!lanes.includes(p)) {
        const free = lanes.indexOf(null);
        if (free !== -1) lanes[free] = p;
        else lanes.push(p);
      }
    }

    while (lanes.length > 0 && lanes[lanes.length - 1] === null) lanes.pop();
  }

  return result;
}

function isAuthError(e: any): boolean {
  const msg = (e?.stderr || e?.message || '').toString().toLowerCase();
  return (
    msg.includes('authentication failed') ||
    msg.includes('could not read username') ||
    msg.includes('could not read password') ||
    msg.includes('permission denied') ||
    msg.includes('invalid credentials') ||
    msg.includes('repository not found') ||
    (e?.status === 128 && msg.includes('fatal'))
  );
}

export async function GET() {
  try {
    const { getActiveRepoPath } = require('@/lib/db');

    const repoBase = getActiveRepoPath();
    if (!repoBase) return NextResponse.json({ success: true, repos: [] });
    if (!fs.existsSync(repoBase)) return NextResponse.json({ success: true, repos: [], missing: true });

    // Single repo (.git at repoBase) or multi-repo children.
    const repoPaths: { name: string; dir: string }[] = [];
    if (fs.existsSync(path.join(repoBase, '.git'))) {
      repoPaths.push({ name: path.basename(repoBase), dir: repoBase });
    } else {
      for (const f of fs.readdirSync(repoBase)) {
        const dir = path.join(repoBase, f);
        if (fs.statSync(dir).isDirectory() && fs.existsSync(path.join(dir, '.git'))) {
          repoPaths.push({ name: f, dir });
        }
      }
    }

    const repos: { name: string; commits: GraphCommit[]; auth_error?: boolean }[] = [];

    for (const { name, dir } of repoPaths) {
      try {
        const SEP = '\x1f';
        const gitBin = process.env.GIT_BIN || '/usr/bin/git';
        const raw: string = execFileSync(
          gitBin,
          [
            'log', '--all', '--topo-order',
            `--pretty=format:%H${SEP}%P${SEP}%h${SEP}%s${SEP}%an${SEP}%ar${SEP}%D${SEP}%(trailers:key=Co-Authored-By,valueonly,separator=%x20)`,
            '-n', '2000',
          ],
          { cwd: dir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
        );

        const parsed: Omit<GraphCommit, 'lane' | 'color'>[] = raw
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const [hash, parentsRaw, short, message, author, date, refsRaw, trailerRaw] = line.split(SEP);
            // Extract model name from "Claude Sonnet 4.6 <noreply@anthropic.com>"
            const trailerValue = (trailerRaw ?? '').trim();
            const aiModel = trailerValue
              ? trailerValue.replace(/<[^>]+>/g, '').trim() || undefined
              : undefined;
            return {
              hash: hash?.trim() ?? '',
              parents: (parentsRaw?.trim() ?? '').split(' ').filter(Boolean),
              short: short?.trim() ?? '',
              message: message?.trim() ?? '',
              author: author?.trim() ?? '',
              date: date?.trim() ?? '',
              refs: (refsRaw?.trim() ?? '').split(',').map(r => r.trim()).filter(Boolean),
              aiModel,
            };
          })
          .filter((c) => c.hash);

        repos.push({ name, commits: assignLanes(parsed) });
      } catch (e: any) {
        if (isAuthError(e)) {
          repos.push({ name, commits: [], auth_error: true });
        } else {
          repos.push({ name, commits: [] });
        }
      }
    }

    return NextResponse.json({ success: true, repos });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
