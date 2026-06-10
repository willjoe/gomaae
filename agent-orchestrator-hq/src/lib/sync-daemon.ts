import fs from 'fs';
import path from 'path';
import { db, getActiveProjectRoot } from './db';
import { sanitizeRole } from './agentRoles';

const LINEAR_API_URL = "https://api.linear.app/graphql";

/** Read a per-workstation setting from the active project's `project_settings`. */
function getSetting(key: string): string | null {
  try {
    const row = db.prepare('SELECT value FROM project_settings WHERE key = ?').get(key) as any;
    return row?.value ?? null;
  } catch {
    // No active workstation, or the table isn't ready yet.
    return null;
  }
}

/** Persist a per-workstation setting (used for the incremental-sync watermark). */
function setSetting(key: string, value: string) {
  try {
    db.prepare('INSERT OR REPLACE INTO project_settings (key, value) VALUES (?, ?)').run(key, value);
  } catch (e) {
    console.error('[sync] setSetting failed:', e);
  }
}

/**
 * Linear API key is configured per-workstation via the connection wizard
 * (stored in `project_settings.linear_api_key`). `LINEAR_API_KEY` is a dev fallback.
 */
function getLinearApiKey(): string | null {
  const key = getSetting('linear_api_key') || process.env.LINEAR_API_KEY || null;
  // Sentinels written by the OAuth/CLI auth flows are not usable as raw API keys.
  if (!key || key === 'oauth_managed_token' || key === 'cli_managed_proxy') return null;
  return key;
}

async function linearGraphQL(apiKey: string, query: string, variables = {}) {
  const res = await fetch(LINEAR_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": apiKey },
    body: JSON.stringify({ query, variables })
  });
  return await res.json();
}

/** Resolve which Linear team to sync. Prefers an explicit setting; otherwise auto-selects a sole team. */
async function resolveTeamId(apiKey: string): Promise<string | null> {
  const configured = getSetting('linear_team_id') || process.env.LINEAR_TEAM_ID;
  if (configured) return configured;
  const res = await linearGraphQL(apiKey, '{ teams { nodes { id name } } }');
  const teams = res.data?.teams?.nodes || [];
  if (teams.length === 0) return null;
  if (teams.length > 1) {
    console.warn(`[sync] Multiple Linear teams found; set 'linear_team_id' to disambiguate. Using "${teams[0].name}".`);
  }
  return teams[0].id;
}

function parseLinearDescription(description: string) {
  let cleanDescription = description || '';
  const meta: any = {};
  
  // Look for YAML-like block: ```yaml ... ``` or at the end
  const yamlMatch = cleanDescription.match(/```yaml\n([\s\S]*?)\n```/);
  if (yamlMatch) {
    const yamlContent = yamlMatch[1];
    cleanDescription = cleanDescription.replace(yamlMatch[0], '').trim();

    yamlContent.split('\n').forEach(line => {
      const [key, ...values] = line.split(':');
      if (key && values.length) {
        meta[key.trim()] = values.join(':').trim();
      }
    });
  }
  return { cleanDescription, meta };
}

function serializeToLinearDescription(description: string, meta: any) {
  const entries = Object.entries(meta).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) return description || '';
  let yaml = '\n\n```yaml\n';
  for (const [k, v] of entries) {
    yaml += `${k}: ${v}\n`;
  }
  yaml += '```';
  return (description || '') + yaml;
}

/** Overwrite a Linear issue's description (used to push corrected metadata back). */
async function updateLinearDescription(apiKey: string, issueId: string, description: string) {
  const mutation = `mutation($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) { success }
  }`;
  return linearGraphQL(apiKey, mutation, { id: issueId, input: { description } });
}

// --- Comments & attachments -------------------------------------------------

// Markdown links/images pointing at Linear's upload host: [name](url) or ![](url).
const LINEAR_UPLOAD_RE = /!?\[([^\]]*)\]\((https:\/\/uploads\.linear\.app\/[^)\s]+)\)/g;

function safeFilename(name: string, url: string): string {
  let base = (name || '').trim();
  if (!base) {
    try { base = decodeURIComponent(new URL(url).pathname.split('/').pop() || ''); } catch { /* ignore */ }
  }
  // Basename only — never let a comment write outside the attachments folder.
  base = base.replace(/[\\/]/g, '_').replace(/[\u0000-\u001f]/g, '').trim();
  return base || `attachment-${Date.now()}`;
}

/**
 * Download a comment's Linear-hosted attachments into Files & Assets
 * (`DocsAssets/attachments/<identifier>/`). Returns the stored references; the
 * URL is kept even when a download fails so the link isn't lost.
 */
async function saveCommentAttachments(apiKey: string, identifier: string, body: string): Promise<{ name: string; path: string; url: string }[]> {
  const out: { name: string; path: string; url: string }[] = [];
  const root = getActiveProjectRoot();
  if (!root || !body) return out;

  const matches = [...body.matchAll(LINEAR_UPLOAD_RE)];
  if (matches.length === 0) return out;

  const relDir = path.join('attachments', identifier);
  const absDir = path.join(root, 'DocsAssets', relDir);

  for (const m of matches) {
    const url = m[2];
    const filename = safeFilename(m[1], url);
    const relPath = path.join(relDir, filename);
    const absPath = path.join(absDir, filename);
    try {
      if (!fs.existsSync(absPath)) {
        const res = await fetch(url, { headers: { Authorization: apiKey } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        fs.mkdirSync(absDir, { recursive: true });
        fs.writeFileSync(absPath, Buffer.from(await res.arrayBuffer()));
      }
      out.push({ name: filename, path: relPath, url });
    } catch (e) {
      console.error(`[sync] Failed to download attachment ${url}:`, e);
      out.push({ name: filename, path: '', url });
    }
  }
  return out;
}

/** Upsert all comments for a synced issue into the local comments table. */
async function syncIssueComments(apiKey: string, issue: any): Promise<number> {
  const comments = issue.comments?.nodes || [];
  if (comments.length === 0) return 0;

  const upsert = db.prepare(`
    INSERT INTO comments (id, ticket_id, author, body, attachments, source, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'linear', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      author=excluded.author,
      body=excluded.body,
      attachments=excluded.attachments,
      updated_at=excluded.updated_at
  `);

  for (const c of comments) {
    const author = c.user?.displayName || 'Unknown';
    const attachments = await saveCommentAttachments(apiKey, issue.identifier, c.body || '');
    upsert.run(c.id, issue.id, author, c.body || '', JSON.stringify(attachments), c.createdAt, c.updatedAt);
  }
  return comments.length;
}

/**
 * Ingest a single comment delivered by a Linear webhook (real-time path).
 * Reuses the same upsert + attachment handling as the polling sync.
 */
export async function ingestLinearComment(input: {
  id: string;
  ticketId: string;
  issueIdentifier?: string;
  author?: string;
  body?: string;
  createdAt?: string;
  updatedAt?: string;
}): Promise<void> {
  if (!input.id || !input.ticketId) return;
  const apiKey = getLinearApiKey();
  const attachments = apiKey
    ? await saveCommentAttachments(apiKey, input.issueIdentifier || input.ticketId, input.body || '')
    : [];
  db.prepare(`
    INSERT INTO comments (id, ticket_id, author, body, attachments, source, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'linear', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      author=excluded.author,
      body=excluded.body,
      attachments=excluded.attachments,
      updated_at=excluded.updated_at
  `).run(
    input.id, input.ticketId, input.author || 'Unknown', input.body || '',
    JSON.stringify(attachments), input.createdAt || null, input.updatedAt || null
  );
}

/** Remove a comment (Linear webhook 'remove' action). */
export function removeLinearComment(id: string): void {
  if (!id) return;
  try {
    db.prepare('DELETE FROM comments WHERE id = ?').run(id);
  } catch (e) {
    console.error('[webhook] remove comment failed:', e);
  }
}

// --- Outbound: create local-only tickets in Linear --------------------------

/**
 * Push locally-created tickets (id `tkt-*`, never synced) to Linear via issueCreate,
 * then rebind each local row to its new Linear id/identifier so it round-trips on the
 * next inbound sync. Orchestration attributes (tier, links, dates, role…) ride in the
 * description's YAML block; parent / due date / workflow state map onto Linear's
 * native fields.
 */
export async function pushLocalTicketsToLinear(): Promise<{ pushed: number; failed: number; error?: string }> {
  const apiKey = getLinearApiKey();
  if (!apiKey) return { pushed: 0, failed: 0, error: 'No Linear API key for the active workstation.' };
  // Cheap local check first — when there's nothing to push (the common case on a
  // continuous sync loop), make no Linear calls at all.
  const order: Record<string, number> = { Epic: 0, Story: 1, Task: 2, QA: 3, UnitTest: 3, Triage: 3, Document: 4 };
  const locals = (db.prepare("SELECT * FROM tickets WHERE id LIKE 'tkt-%'").all() as any[])
    .sort((a, b) => (order[a.tier] ?? 5) - (order[b.tier] ?? 5));
  if (locals.length === 0) return { pushed: 0, failed: 0 };

  const teamId = await resolveTeamId(apiKey);
  if (!teamId) return { pushed: 0, failed: 0, error: 'Could not resolve a Linear team.' };

  // Map our statuses onto the team's workflow states.
  const stRes = await linearGraphQL(apiKey, `query($t: String!) { team(id: $t) { states { nodes { id name type } } } }`, { t: teamId });
  const states: any[] = stRes.data?.team?.states?.nodes || [];
  const stateIdFor = (status: string): string | undefined => {
    const s = (status || '').toLowerCase();
    const wantType = s === 'done' ? 'completed'
      : (s === 'in review' || s === 'in progress') ? 'started'
      : s === 'backlog' ? 'backlog' : 'unstarted';
    const byName = states.find((x) => (x.name || '').toLowerCase() === s);
    return (byName || states.find((x) => x.type === wantType) || states[0])?.id;
  };

  const idMap: Record<string, { id: string; identifier: string }> = {};
  let pushed = 0, failed = 0;

  for (const t of locals) {
    const parentNew = t.parent_id ? idMap[t.parent_id]?.id : undefined;
    const linkedNew = t.linked_ticket_id ? (idMap[t.linked_ticket_id]?.id || t.linked_ticket_id) : undefined;
    const meta = {
      tier: t.tier,
      parent_id: parentNew,
      linked_ticket_id: linkedNew,
      start_date: t.start_date,
      due_date: t.due_date,
      llm_role: t.llm_role,
      authorized_model: t.authorized_model,
      blocked_by: t.blocked_by,
    };
    const description = serializeToLinearDescription(t.description || '', meta);
    const input: any = { teamId, title: t.title, description };
    if (parentNew) input.parentId = parentNew;
    if (t.due_date) input.dueDate = t.due_date;
    const sid = stateIdFor(t.status);
    if (sid) input.stateId = sid;

    const res = await linearGraphQL(apiKey,
      `mutation($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier } } }`,
      { input });
    const issue = res.data?.issueCreate?.issue;
    if (!res.data?.issueCreate?.success || !issue) {
      console.error(`[push] issueCreate failed for ${t.identifier}:`, JSON.stringify(res.errors || res.data));
      failed++;
      continue;
    }
    idMap[t.id] = { id: issue.id, identifier: issue.identifier };
    pushed++;
  }

  // Rebind local rows to their new Linear ids/identifiers, then repoint references.
  const apply = db.transaction(() => {
    for (const [oldId, n] of Object.entries(idMap)) {
      db.prepare('UPDATE tickets SET id = ?, identifier = ? WHERE id = ?').run(n.id, n.identifier, oldId);
    }
    for (const [oldId, n] of Object.entries(idMap)) {
      db.prepare('UPDATE tickets SET parent_id = ? WHERE parent_id = ?').run(n.id, oldId);
      db.prepare('UPDATE tickets SET linked_ticket_id = ? WHERE linked_ticket_id = ?').run(n.id, oldId);
      db.prepare('UPDATE comments SET ticket_id = ? WHERE ticket_id = ?').run(n.id, oldId);
    }
  });
  apply();

  console.log(`[push] Created ${pushed} Linear issue(s)${failed ? `, ${failed} failed` : ''}.`);
  return { pushed, failed };
}

export interface SyncResult {
  synced: number;
  pushed?: number;
  skipped?: string;
  error?: string;
}

export async function runSyncCycle(): Promise<SyncResult> {
  console.log(`[${new Date().toISOString()}] Starting sync cycle...`);

  const apiKey = getLinearApiKey();
  if (!apiKey) {
    console.log('[sync] No Linear API key for the active workstation — skipping. Add one via the Linear connection wizard.');
    return { synced: 0, skipped: 'no-api-key' };
  }

  // 1. Inbound: Linear -> SQLite. Incremental by an `updatedAt` watermark (only
  //    issues changed since our last successful sync) and paginated (so we aren't
  //    capped at 50). A comment bumps its issue's updatedAt, so comment-only changes
  //    are still picked up. Verified against live data.
  const q = `query($filter: IssueFilter, $after: String) {
    issues(first: 50, after: $after, filter: $filter, orderBy: updatedAt) {
      nodes {
        id identifier title description state { name } updatedAt
        comments { nodes { id body createdAt updatedAt user { displayName } } }
      }
      pageInfo { hasNextPage endCursor }
    }
  }`;
  let synced = 0;
  try {
    const teamId = await resolveTeamId(apiKey);
    if (!teamId) {
      console.log('[sync] Could not resolve a Linear team — skipping inbound sync.');
      return { synced: 0, skipped: 'no-team' };
    }

    // Watermark: last issue updatedAt we synced for THIS team. A different team (or
    // first run) forces a full backfill.
    const since = getSetting('linear_synced_through');
    const syncedTeam = getSetting('linear_synced_team_id');
    const incremental = !!since && syncedTeam === teamId;
    const filter: any = { team: { id: { eq: teamId } } };
    if (incremental) filter.updatedAt = { gt: since };

    // Linear owns title/description/status; the orchestration columns are HIAD-local.
    // COALESCE keeps existing local values when an issue carries no YAML metadata, so a
    // sync never wipes locally-entered attributes (e.g. between import and first write-back).
    const upsert = db.prepare(`
      INSERT INTO tickets (
        id, identifier, title, description, status, updated_at,
        agent_state, agent_phase, tier, parent_id, assigned_agent_id,
        start_date, due_date, linked_ticket_id, blocked_by, authorized_model, llm_role
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        identifier=excluded.identifier,
        title=excluded.title,
        description=excluded.description,
        status=excluded.status,
        updated_at=excluded.updated_at,
        agent_state=COALESCE(excluded.agent_state, tickets.agent_state),
        agent_phase=COALESCE(excluded.agent_phase, tickets.agent_phase),
        tier=COALESCE(excluded.tier, tickets.tier),
        parent_id=COALESCE(excluded.parent_id, tickets.parent_id),
        assigned_agent_id=COALESCE(excluded.assigned_agent_id, tickets.assigned_agent_id),
        start_date=COALESCE(excluded.start_date, tickets.start_date),
        due_date=COALESCE(excluded.due_date, tickets.due_date),
        linked_ticket_id=COALESCE(excluded.linked_ticket_id, tickets.linked_ticket_id),
        blocked_by=COALESCE(excluded.blocked_by, tickets.blocked_by),
        authorized_model=COALESCE(excluded.authorized_model, tickets.authorized_model),
        llm_role=COALESCE(excluded.llm_role, tickets.llm_role)
    `);

    const linearFixes: { id: string; description: string }[] = [];
    let syncedComments = 0;
    let maxUpdatedAt = since || null;
    let after: string | null = null;

    do {
      const page = await linearGraphQL(apiKey, q, { filter, after });
      if (page.errors) {
        const message = page.errors[0]?.message || 'Linear API error';
        console.error('[sync] Inbound query error:', message);
        return { synced, error: message };
      }
      const conn = page.data?.issues;
      const pageIssues = conn?.nodes || [];

      for (const issue of pageIssues) {
      const { cleanDescription, meta } = parseLinearDescription(issue.description);

      // Validate the assigned role against Agent Roles for the ticket's level. An unknown
      // role becomes null locally (null = "don't run by AI"); if it came from Linear's YAML
      // metadata, strip it there too so both sides stay consistent.
      const tierForRole = meta.tier
        || (db.prepare('SELECT tier FROM tickets WHERE id = ?').get(issue.id) as any)?.tier
        || null;
      const rawRole = meta.llm_role || null;
      const cleanRole = sanitizeRole(rawRole, tierForRole);
      if (rawRole && !cleanRole) {
        const fixedMeta = { ...meta };
        delete fixedMeta.llm_role;
        linearFixes.push({ id: issue.id, description: serializeToLinearDescription(cleanDescription, fixedMeta) });
      }

      upsert.run(
        issue.id,
        issue.identifier,
        issue.title,
        cleanDescription,
        issue.state.name,
        issue.updatedAt,
        meta.agent_state || null,
        meta.agent_phase || null,
        meta.tier || null,
        meta.parent_id || null,
        meta.assigned_agent_id || null,
        meta.start_date || null,
        meta.due_date || null,
        meta.linked_ticket_id || null,
        meta.blocked_by || null,
        meta.authorized_model || null,
        cleanRole
      );

      // Sync this issue's comments (+ download their attachments to Files & Assets).
      try {
        syncedComments += await syncIssueComments(apiKey, issue);
      } catch (e) {
        console.error(`[sync] Comment sync failed for ${issue.identifier}:`, e);
      }

      if (!maxUpdatedAt || issue.updatedAt > maxUpdatedAt) maxUpdatedAt = issue.updatedAt;
      }

      synced += pageIssues.length;
      after = conn?.pageInfo?.hasNextPage ? conn.pageInfo.endCursor : null;
    } while (after);

    // Advance the watermark so the next cycle only pulls issues changed after this.
    if (maxUpdatedAt) setSetting('linear_synced_through', maxUpdatedAt);
    setSetting('linear_synced_team_id', teamId);

    if (syncedComments) console.log(`[sync] Synced ${syncedComments} comment(s).`);

    // Push corrected descriptions back to Linear for any invalid roles we nulled.
    for (const fix of linearFixes) {
      try {
        await updateLinearDescription(apiKey, fix.id, fix.description);
      } catch (e) {
        console.error(`[sync] Failed to null invalid role on Linear issue ${fix.id}:`, e);
      }
    }
    if (linearFixes.length) {
      console.log(`[sync] Nulled invalid roles on ${linearFixes.length} Linear issue(s).`);
    }
  } catch (err: any) {
    console.error("Inbound sync failed:", err);
    return { synced: 0, error: err?.message || String(err) };
  }

  // 2. Outbound: create any locally-made tickets (id `tkt-*`) in Linear so the two
  //    sides stay continuously in sync. Independent of the inbound result.
  let pushed = 0;
  try {
    const r = await pushLocalTicketsToLinear();
    pushed = r.pushed;
  } catch (e) {
    console.error('[sync] Outbound push failed:', e);
  }

  console.log(`[${new Date().toISOString()}] Sync cycle complete — ${synced} pulled, ${pushed} pushed.`);
  return { synced, pushed };
}

// NOTE: There is intentionally no server-side daemon. The static Tauri export has
// no Node server, so a server `setInterval` would never run there. Polling is driven
// from the client instead (see LifecycleProvider), which calls `runSyncCycle` via
// POST /api/linear/sync on an interval. Real-time updates come from the webhook.
