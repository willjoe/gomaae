import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
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
  // lanes[i] = hash of the commit this lane is currently "tracking toward" (i.e., its next parent)
  const lanes: (string | null)[] = [];
  const result: GraphCommit[] = [];

  for (const c of commits) {
    let lane = lanes.indexOf(c.hash);

    if (lane === -1) {
      // Not claimed by any lane — open the first free slot.
      lane = lanes.indexOf(null);
      if (lane === -1) { lane = lanes.length; lanes.push(null); }
    }

    result.push({ ...c, lane, color: LANE_COLORS[lane % LANE_COLORS.length] });

    // Advance this lane toward the first parent.
    lanes[lane] = c.parents[0] ?? null;

    // Additional parents (merge commits) claim new lanes.
    for (let i = 1; i < c.parents.length; i++) {
      const p = c.parents[i];
      if (!lanes.includes(p)) {
        const free = lanes.indexOf(null);
        if (free !== -1) lanes[free] = p;
        else lanes.push(p);
      }
    }

    // Collapse empty tails.
    while (lanes.length > 0 && lanes[lanes.length - 1] === null) lanes.pop();
  }

  return result;
}

export async function GET() {
  try {
    const { getActiveProjectRoot } = require('@/lib/db');
    const { simpleGit } = require('simple-git');

    const workspaceRoot = getActiveProjectRoot();
    if (!workspaceRoot) return NextResponse.json({ success: true, repos: [] });

    const repoBase = path.join(workspaceRoot, 'Repository');
    if (!fs.existsSync(repoBase)) return NextResponse.json({ success: true, repos: [] });

    // Discover repos: single-repo (Repository/.git) or multi-repo children.
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

    const repos: { name: string; commits: GraphCommit[] }[] = [];

    for (const { name, dir } of repoPaths) {
      try {
        const git = simpleGit(dir);
        const SEP = '\x1f';
        const raw: string = await git.raw([
          'log', '--all', '--topo-order',
          `--pretty=format:%H${SEP}%P${SEP}%h${SEP}%s${SEP}%an${SEP}%ar${SEP}%D`,
          '-n', '200',
        ]);

        const parsed: Omit<GraphCommit, 'lane' | 'color'>[] = raw
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const [hash, parentsRaw, short, message, author, date, refsRaw] = line.split(SEP);
            return {
              hash: hash?.trim() ?? '',
              parents: (parentsRaw?.trim() ?? '').split(' ').filter(Boolean),
              short: short?.trim() ?? '',
              message: message?.trim() ?? '',
              author: author?.trim() ?? '',
              date: date?.trim() ?? '',
              refs: (refsRaw?.trim() ?? '').split(',').map(r => r.trim()).filter(Boolean),
            };
          })
          .filter((c) => c.hash);

        repos.push({ name, commits: assignLanes(parsed) });
      } catch (e: any) {
        repos.push({ name, commits: [] });
      }
    }

    return NextResponse.json({ success: true, repos });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
