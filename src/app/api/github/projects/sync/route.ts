/**
 * POST /api/github/projects/sync
 *
 * Full bidirectional sync between the active gomaae workstation and a GitHub
 * repository + Projects v2 board.
 *
 * Strategy (inbound-first to preserve user's GitHub edits):
 *   1. Fetch all current project items from GitHub.
 *   2. INBOUND  — for each item whose GitHub-side status changed since the last
 *      sync watermark (and whose local copy hasn't changed since then either),
 *      update the local ticket's status.
 *   3. OUTBOUND — push every local ticket to GitHub:
 *        · title   = `[IDENTIFIER] <title>`
 *        · body    = description + ```yaml``` meta block (YAML carries all
 *                    gomaae fields that GitHub has no native column for)
 *        · labels  = tier:xxx
 *        · state   = open | closed
 *        · assignees = [github_login]
 *      For new tickets: create issue → add to project → set Status field.
 *      For existing tickets: update issue → update project Status field.
 *   4. Advance the sync watermark so the next call is incremental.
 *
 * Fields stored in YAML (in issue body):
 *   local_id, identifier, tier, parent_id, llm_role, authorized_model,
 *   start_date, due_date, blocked_by, linked_ticket_id, status
 */
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db, getActiveProjectId } from '@/lib/db';

const REST = 'https://api.github.com';
const GQL  = 'https://api.github.com/graphql';

// ── DB helpers ────────────────────────────────────────────────────────────────

function getSetting(key: string): string | null {
  try {
    return (db.prepare('SELECT value FROM project_settings WHERE key = ?').get(key) as any)?.value ?? null;
  } catch { return null; }
}
function setSetting(key: string, value: string) {
  try {
    db.prepare('INSERT OR REPLACE INTO project_settings (key, value) VALUES (?, ?)').run(key, value);
  } catch { /* non-fatal */ }
}

// ── GitHub API helpers ────────────────────────────────────────────────────────

async function rest(token: string, method: string, path: string, body?: any) {
  const res = await fetch(`${REST}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json().catch(() => ({}));
}

async function gql(token: string, query: string, variables: any = {}) {
  const res = await fetch(GQL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

// ── YAML body helpers ─────────────────────────────────────────────────────────

function parseGithubBody(body: string): { clean: string; meta: Record<string, string> } {
  let clean = body || '';
  const meta: Record<string, string> = {};
  const match = clean.match(/```yaml\n([\s\S]*?)\n```/);
  if (match) {
    clean = clean.replace(match[0], '').trim();
    for (const line of match[1].split('\n')) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const k = line.slice(0, idx).trim();
        const v = line.slice(idx + 1).trim();
        if (k && v) meta[k] = v;
      }
    }
  }
  return { clean, meta };
}

function serializeGithubBody(description: string, meta: Record<string, string | null | undefined>): string {
  const entries = Object.entries(meta).filter(([, v]) => v != null && v !== '');
  if (entries.length === 0) return description || '';
  let yaml = '\n\n```yaml\n';
  for (const [k, v] of entries) yaml += `${k}: ${v}\n`;
  yaml += '```';
  return (description || '') + yaml;
}

function stripPrefix(title: string): string {
  return title.replace(/^\[[^\]]+\]\s*/, '');
}

// ── Status mapping ────────────────────────────────────────────────────────────

const GOMAAE_STATUS_ALIASES: Record<string, string[]> = {
  'Backlog':     ['backlog', 'new'],
  'To Do':       ['todo', 'to do', 'not started', 'open'],
  'In Progress': ['in progress', 'in-progress', 'wip', 'doing', 'started'],
  'In Review':   ['in review', 'in-review', 'review', 'code review', 'pr review'],
  'Done':        ['done', 'complete', 'completed', 'closed', 'merged', 'shipped'],
};

function mapGhStatusToGomaae(name: string): string {
  const n = (name || '').toLowerCase().trim();
  for (const [gomaae, aliases] of Object.entries(GOMAAE_STATUS_ALIASES)) {
    if (aliases.includes(n)) return gomaae;
  }
  return 'Backlog';
}

function findStatusOptionId(gomaaeStatus: string, options: Record<string, string>): string | null {
  const aliases = GOMAAE_STATUS_ALIASES[gomaaeStatus] ?? [];
  for (const [name, id] of Object.entries(options)) {
    const n = name.toLowerCase().trim();
    if (n === gomaaeStatus.toLowerCase() || aliases.includes(n)) return id;
  }
  return null;
}

function issueState(status: string): 'open' | 'closed' {
  const s = (status || '').toLowerCase();
  return (s === 'done' || s === 'cancelled' || s === 'merged') ? 'closed' : 'open';
}

// ── Project resolution ────────────────────────────────────────────────────────

const PROJECT_FIELDS_QUERY = `
  query($login: String!, $num: Int!) {
    user(login: $login) {
      projectV2(number: $num) {
        id
        fields(first: 20) { nodes { ... on ProjectV2SingleSelectField { id name options { id name } } } }
      }
    }
    organization(login: $login) {
      projectV2(number: $num) {
        id
        fields(first: 20) { nodes { ... on ProjectV2SingleSelectField { id name options { id name } } } }
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

// ── Project items fetch (paginated) ──────────────────────────────────────────

const PROJECT_ITEMS_QUERY = `
  query($pid: ID!, $cursor: String) {
    node(id: $pid) {
      ... on ProjectV2 {
        items(first: 50, after: $cursor) {
          nodes {
            id
            fieldValues(first: 10) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  field { ... on ProjectV2SingleSelectField { name } }
                }
              }
            }
            content {
              ... on Issue {
                number title body state updatedAt url
              }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  }
`;

interface ProjectItem {
  itemId: string;
  issueNumber: number;
  statusName: string | null;
  body: string;
  title: string;
  state: string;
  updatedAt: string;
}

async function fetchAllProjectItems(token: string, projectId: string): Promise<ProjectItem[]> {
  const items: ProjectItem[] = [];
  let cursor: string | null = null;
  do {
    const data = await gql(token, PROJECT_ITEMS_QUERY, { pid: projectId, cursor });
    const page = data.data?.node?.items;
    if (!page) break;
    for (const node of page.nodes ?? []) {
      const issue = node.content;
      if (!issue?.number) continue;
      let statusName: string | null = null;
      for (const fv of node.fieldValues?.nodes ?? []) {
        if (fv?.field?.name === 'Status') statusName = fv.name ?? null;
      }
      items.push({
        itemId: node.id,
        issueNumber: issue.number,
        statusName,
        body: issue.body || '',
        title: issue.title || '',
        state: issue.state || 'OPEN',
        updatedAt: issue.updatedAt || '',
      });
    }
    cursor = page.pageInfo?.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);
  return items;
}

// ── Tier labels ───────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  'tier:epic': 'e11d48', 'tier:operation': 'f97316',
  'tier:story': '7c3aed', 'tier:task': '2563eb',
  'tier:unittest': '16a34a', 'tier:qa': 'ea580c',
  'tier:triage': '64748b', 'tier:document': '0891b2',
};
function tierLabel(tier: string) { return `tier:${(tier || 'task').toLowerCase()}`; }

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST() {
  try {
    if (!getActiveProjectId()) {
      return NextResponse.json({ success: false, error: 'No active workspace.' }, { status: 400 });
    }

    const token     = getSetting('github_projects_api_key');
    const owner     = getSetting('github_projects_owner');
    const repo      = getSetting('github_projects_repo');
    const numStr    = getSetting('github_projects_number');
    const userLogin = getSetting('github_projects_user_name') || getSetting('github_projects_owner') || null;

    if (!token || !owner || !repo) {
      return NextResponse.json({ success: true, skipped: 'not-configured', pushed: 0, synced: 0 });
    }

    const lastSyncAt = getSetting('github_synced_at') || '1970-01-01T00:00:00Z';

    // Ensure github_issue_number column exists.
    try {
      const cols = db.prepare('PRAGMA table_info(tickets)').all() as any[];
      if (cols.length && !cols.some((c: any) => c.name === 'github_issue_number')) {
        db.exec('ALTER TABLE tickets ADD COLUMN github_issue_number INTEGER');
      }
    } catch { /* already exists */ }

    // Ensure tier labels exist in the repo.
    for (const [name, color] of Object.entries(TIER_COLORS)) {
      try {
        await rest(token, 'POST', `/repos/${owner}/${repo}/labels`, { name, color, description: `Gomaae tier: ${name.split(':')[1]}` });
      } catch { /* already exists */ }
    }

    // Resolve Projects v2 board (optional).
    let project: ProjectMeta | null = null;
    if (numStr) {
      try { project = await resolveProject(token, owner, parseInt(numStr, 10)); } catch { /* non-fatal */ }
    }

    // ── 1. Fetch all current project items ───────────────────────────────────
    const projectItems: ProjectItem[] = project ? await fetchAllProjectItems(token, project.id) : [];
    const itemByIssueNum = new Map<number, ProjectItem>(projectItems.map((p) => [p.issueNumber, p]));

    // ── 2. INBOUND: update local status from GitHub when GitHub changed since
    //       last sync and local hasn't been touched since then ─────────────────
    let inboundUpdated = 0;
    for (const item of projectItems) {
      if (!item.statusName) continue;
      const { meta } = parseGithubBody(item.body);
      const localId = meta.local_id || null;

      const ticket = localId
        ? db.prepare('SELECT * FROM tickets WHERE id = ?').get(localId) as any
        : db.prepare('SELECT * FROM tickets WHERE github_issue_number = ?').get(item.issueNumber) as any;
      if (!ticket) continue;

      const ghUpdated  = item.updatedAt;
      const localUpdated = ticket.updated_at || '1970-01-01T00:00:00Z';

      // GitHub changed since last sync AND local hasn't → GitHub wins on status
      if (ghUpdated > lastSyncAt && localUpdated <= lastSyncAt) {
        const newStatus = item.state === 'CLOSED'
          ? 'Done'
          : mapGhStatusToGomaae(item.statusName);
        if (newStatus !== ticket.status) {
          db.prepare('UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(newStatus, ticket.id);
          inboundUpdated++;
        }
      }
    }

    // ── 3. OUTBOUND: push every local ticket to GitHub ───────────────────────
    const tickets = db.prepare('SELECT * FROM tickets ORDER BY created_at ASC').all() as any[];

    let pushed = 0;
    let synced = 0;

    for (const ticket of tickets) {
      const ghTitle = `[${ticket.identifier ?? ticket.tier}] ${ticket.title}`;
      const labels  = [tierLabel(ticket.tier)];
      const state   = issueState(ticket.status);
      const assignees = userLogin ? [userLogin] : [];

      const meta: Record<string, string | null | undefined> = {
        local_id:         ticket.id,
        identifier:       ticket.identifier,
        tier:             ticket.tier,
        parent_id:        ticket.parent_id || undefined,
        llm_role:         ticket.llm_role || undefined,
        authorized_model: ticket.authorized_model || undefined,
        start_date:       ticket.start_datetime ? ticket.start_datetime.slice(0, 10) : undefined,
        due_date:         ticket.due_datetime   ? ticket.due_datetime.slice(0, 10)   : undefined,
        blocked_by:       ticket.blocked_by || undefined,
        linked_ticket_id: ticket.linked_ticket_id || undefined,
        status:           ticket.status,
      };

      const body = serializeGithubBody(ticket.description || '', meta);

      if (!ticket.github_issue_number) {
        // ── create new issue ─────────────────────────────────────────────────
        const issue = await rest(token, 'POST', `/repos/${owner}/${repo}/issues`, {
          title: ghTitle, body, labels, assignees, state,
        });
        if (!issue.number) continue;

        db.prepare('UPDATE tickets SET github_issue_number = ? WHERE id = ?')
          .run(issue.number, ticket.id);
        pushed++;

        if (project && issue.node_id) {
          const addRes = await gql(token, `
            mutation($pid: ID!, $cid: ID!) {
              addProjectV2ItemById(input: { projectId: $pid, contentId: $cid }) {
                item { id }
              }
            }
          `, { pid: project.id, cid: issue.node_id });

          const itemId = addRes.data?.addProjectV2ItemById?.item?.id;
          if (itemId && project.statusFieldId) {
            const optId = findStatusOptionId(ticket.status, project.statusOptions);
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
        // ── update existing issue ────────────────────────────────────────────
        await rest(token, 'PATCH', `/repos/${owner}/${repo}/issues/${ticket.github_issue_number}`, {
          title: ghTitle, body, labels, state, assignees,
        });
        synced++;

        if (project) {
          const existing = itemByIssueNum.get(ticket.github_issue_number);
          if (existing?.itemId && project.statusFieldId) {
            const optId = findStatusOptionId(ticket.status, project.statusOptions);
            if (optId) {
              await gql(token, `
                mutation($pid: ID!, $iid: ID!, $fid: ID!, $v: ProjectV2FieldValue!) {
                  updateProjectV2ItemFieldValue(input: {
                    projectId: $pid, itemId: $iid, fieldId: $fid, value: $v
                  }) { projectV2Item { id } }
                }
              `, { pid: project.id, iid: existing.itemId, fid: project.statusFieldId, v: { singleSelectOptionId: optId } });
            }
          } else if (!existing && project) {
            // Issue exists but not yet on the board — add it now
            const issueData = await rest(token, 'GET', `/repos/${owner}/${repo}/issues/${ticket.github_issue_number}`);
            if (issueData.node_id) {
              const addRes = await gql(token, `
                mutation($pid: ID!, $cid: ID!) {
                  addProjectV2ItemById(input: { projectId: $pid, contentId: $cid }) {
                    item { id }
                  }
                }
              `, { pid: project.id, cid: issueData.node_id });
              const itemId = addRes.data?.addProjectV2ItemById?.item?.id;
              if (itemId && project.statusFieldId) {
                const optId = findStatusOptionId(ticket.status, project.statusOptions);
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
          }
        }
      }
    }

    // Advance watermark.
    setSetting('github_synced_at', new Date().toISOString());

    return NextResponse.json({ success: true, pushed, synced, inboundUpdated });
  } catch (error: any) {
    console.error('[API GitHub Projects Sync]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * GET — return current sync status (last sync time, bound ticket count).
 */
export async function GET() {
  try {
    if (!getActiveProjectId()) return NextResponse.json({ connected: false });
    const lastSyncAt = getSetting('github_synced_at');
    const token      = getSetting('github_projects_api_key');
    const owner      = getSetting('github_projects_owner');
    const repo       = getSetting('github_projects_repo');

    let boundCount = 0;
    try {
      const res = db.prepare('SELECT count(*) as c FROM tickets WHERE github_issue_number IS NOT NULL').get() as any;
      boundCount = res?.c ?? 0;
    } catch { /* table may not exist yet */ }

    return NextResponse.json({
      connected: !!(token && owner && repo),
      lastSyncAt,
      boundCount,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
