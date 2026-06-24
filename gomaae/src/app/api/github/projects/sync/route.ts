import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db, getActiveProjectId } from '@/lib/db';

const REST = 'https://api.github.com';
const GQL  = 'https://api.github.com/graphql';

// ── helpers ──────────────────────────────────────────────────────────────────

function getSetting(key: string): string | null {
  try {
    return (db.prepare('SELECT value FROM project_settings WHERE key = ?').get(key) as any)?.value ?? null;
  } catch { return null; }
}

async function rest(token: string, method: string, path: string, body?: any) {
  const res = await fetch(`${REST}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json().catch(() => ({}));
}

async function gql(token: string, query: string, variables: any = {}) {
  const res = await fetch(GQL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

const TIER_COLORS: Record<string, string> = {
  'tier:epic': 'e11d48', 'tier:story': '7c3aed', 'tier:task': '2563eb',
  'tier:unittest': '16a34a', 'tier:qa': 'ea580c', 'tier:triage': '64748b',
};

function tierLabel(tier: string) {
  return `tier:${(tier || 'task').toLowerCase()}`;
}

function issueState(status: string): 'open' | 'closed' {
  const s = (status || '').toLowerCase();
  return (s === 'done' || s === 'cancelled' || s === 'merged') ? 'closed' : 'open';
}

/** Fuzzy-match a gomaae status string against the project's Status field options. */
function matchStatusOption(status: string, options: Record<string, string>): string | null {
  const s = (status || 'to do').toLowerCase().trim();
  const aliases: Record<string, string[]> = {
    'todo':        ['to do', 'todo', 'backlog', 'open', 'not started'],
    'in progress': ['in progress', 'wip', 'doing', 'started', 'in-progress'],
    'in review':   ['in review', 'review', 'code review', 'pr review', 'in-review'],
    'done':        ['done', 'closed', 'complete', 'completed', 'merged', 'shipped'],
  };
  const canonical = Object.entries(aliases).find(([, vs]) => vs.includes(s))?.[0] ?? s;
  for (const [name, id] of Object.entries(options)) {
    const n = name.toLowerCase().trim();
    if (n === s || n === canonical || (aliases[canonical] ?? []).includes(n)) return id;
  }
  return null;
}

// ── project resolution ────────────────────────────────────────────────────────

const PROJECT_FIELDS_QUERY = `
  query($login: String!, $num: Int!) {
    user(login: $login) {
      projectV2(number: $num) {
        id
        fields(first: 20) {
          nodes {
            ... on ProjectV2SingleSelectField { id name options { id name } }
          }
        }
      }
    }
    organization(login: $login) {
      projectV2(number: $num) {
        id
        fields(first: 20) {
          nodes {
            ... on ProjectV2SingleSelectField { id name options { id name } }
          }
        }
      }
    }
  }
`;

interface ProjectMeta {
  id: string;
  statusFieldId: string | null;
  statusOptions: Record<string, string>;
}

async function resolveProject(token: string, owner: string, num: number): Promise<ProjectMeta | null> {
  const data = await gql(token, PROJECT_FIELDS_QUERY, { login: owner, num });
  const proj = data.data?.user?.projectV2 ?? data.data?.organization?.projectV2;
  if (!proj) return null;

  let statusFieldId: string | null = null;
  const statusOptions: Record<string, string> = {};
  for (const field of proj.fields?.nodes ?? []) {
    if (field.name === 'Status') {
      statusFieldId = field.id;
      for (const opt of field.options ?? []) statusOptions[opt.name] = opt.id;
    }
  }
  return { id: proj.id, statusFieldId, statusOptions };
}

// ── sync ─────────────────────────────────────────────────────────────────────

export async function POST() {
  try {
    if (!getActiveProjectId()) {
      return NextResponse.json({ success: false, error: 'No active workspace.' }, { status: 400 });
    }

    const token  = getSetting('github_projects_api_key');
    const owner  = getSetting('github_projects_owner');
    const repo   = getSetting('github_projects_repo');
    const numStr = getSetting('github_projects_number');

    if (!token || !owner || !repo) {
      return NextResponse.json({ success: true, skipped: 'not-configured', pushed: 0, synced: 0 });
    }

    // Ensure github_issue_number column exists (added here so no separate migration needed).
    try {
      const cols = db.prepare('PRAGMA table_info(tickets)').all() as any[];
      if (cols.length && !cols.some((c: any) => c.name === 'github_issue_number')) {
        db.exec('ALTER TABLE tickets ADD COLUMN github_issue_number INTEGER');
      }
    } catch { /* already exists or skipped */ }

    // Ensure tier labels exist in the repo (ignore errors — label may already exist).
    for (const [name, color] of Object.entries(TIER_COLORS)) {
      try {
        await rest(token, 'POST', `/repos/${owner}/${repo}/labels`, { name, color });
      } catch { /* ignore */ }
    }

    // Resolve the Projects v2 board (optional).
    let project: ProjectMeta | null = null;
    if (numStr) {
      project = await resolveProject(token, owner, parseInt(numStr, 10));
    }

    const tickets = db.prepare(
      "SELECT * FROM tickets WHERE (execution_flag IS NULL OR execution_flag != 0) ORDER BY created_at ASC"
    ).all() as any[];

    let pushed = 0;
    let synced = 0;

    for (const ticket of tickets) {
      const title  = `[${ticket.identifier ?? ticket.tier}] ${ticket.title}`;
      const body   = ticket.description || '';
      const labels = [tierLabel(ticket.tier)];
      const state  = issueState(ticket.status);

      if (!ticket.github_issue_number) {
        // ── outbound: create new issue ────────────────────────────────────────
        const issue = await rest(token, 'POST', `/repos/${owner}/${repo}/issues`, { title, body, labels });
        if (!issue.number) continue;

        db.prepare('UPDATE tickets SET github_issue_number = ? WHERE id = ?').run(issue.number, ticket.id);
        pushed++;

        // Optionally add to project and set Status field.
        if (project && issue.node_id) {
          const addResult = await gql(token, `
            mutation($pid: ID!, $cid: ID!) {
              addProjectV2ItemById(input: { projectId: $pid, contentId: $cid }) {
                item { id }
              }
            }
          `, { pid: project.id, cid: issue.node_id });

          const itemId = addResult.data?.addProjectV2ItemById?.item?.id;
          if (itemId && project.statusFieldId) {
            const optId = matchStatusOption(ticket.status, project.statusOptions);
            if (optId) {
              await gql(token, `
                mutation($pid: ID!, $iid: ID!, $fid: ID!, $v: ProjectV2FieldValue!) {
                  updateProjectV2ItemFieldValue(input: {
                    projectId: $pid, itemId: $iid, fieldId: $fid, value: $v
                  }) { projectV2Item { id } }
                }
              `, { pid: project.id, iid: itemId, fid: project.statusFieldId, v: { singleSelectOptionId: optId } });
            }
          }
        }
      } else {
        // ── outbound: update existing issue ──────────────────────────────────
        await rest(token, 'PATCH', `/repos/${owner}/${repo}/issues/${ticket.github_issue_number}`, {
          title, body, labels, state,
        });
        synced++;

        // ── inbound: pull state changes from GitHub back to gomaae ───────────
        const ghIssue = await rest(token, 'GET', `/repos/${owner}/${repo}/issues/${ticket.github_issue_number}`);
        if (ghIssue.state === 'closed' && issueState(ticket.status) === 'open') {
          db.prepare("UPDATE tickets SET status = 'Done', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(ticket.id);
        }
      }
    }

    return NextResponse.json({ success: true, pushed, synced });
  } catch (error: any) {
    console.error('[API GitHub Projects Sync]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
