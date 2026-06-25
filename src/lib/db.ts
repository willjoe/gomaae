import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { getActiveWorkstation } from './appConfig';

/**
 * All persisted state is workstation-scoped and lives in the active workstation's
 * project DB (`<workspace_root>/Tickets/project.db`). There is no global system
 * DB — the workstation registry and global UI prefs live in `config.yaml`
 * (see appConfig), and everything else (tickets, service accounts, settings) is
 * per-workstation.
 */
let activeProjectDb: Database.Database | null = null;
let currentProjectRoot: string | null = null;
let activeDbIno: number | null = null;

export function getActiveProjectId(): string | null {
  try {
    return getActiveWorkstation()?.id ?? null;
  } catch (e) {
    return null;
  }
}

export function getActiveProjectRoot(): string | null {
  try {
    return getActiveWorkstation()?.path ?? null;
  } catch (e) {
    return null;
  }
}

/**
 * Returns the configured git repository root for the active workspace.
 * If `repo_path` is set on the workstation, use it directly (the user pointed
 * it at an existing repo anywhere on disk). Otherwise fall back to the legacy
 * `<workspace_root>/Repository/` convention.
 */
export function getActiveRepoPath(): string | null {
  try {
    const ws = getActiveWorkstation();
    if (!ws) return null;
    if (ws.repo_path) return ws.repo_path;
    return path.join(ws.path, 'Repository');
  } catch (e) {
    return null;
  }
}

function getProjectDb(): Database.Database | null {
  const root = getActiveProjectRoot();
  if (!root) return null;

  const projectDbPath = path.join(root, 'Tickets', 'project.db');
  let currentIno: number | null = null;
  try {
    currentIno = fs.statSync(projectDbPath).ino;
  } catch (e) {}

  if (activeProjectDb && currentProjectRoot === root && activeDbIno === currentIno) {
    return activeProjectDb;
  }

  if (activeProjectDb) {
    try {
      activeProjectDb.close();
    } catch (e) {}
  }

  // Connect to the active project's DB.
  const ticketsDir = path.dirname(projectDbPath);
  if (!fs.existsSync(ticketsDir)) fs.mkdirSync(ticketsDir, { recursive: true });

  const db = new Database(projectDbPath);
  db.pragma('journal_mode = WAL');

  // Bootstrap: ensure the tickets table exists even if the workspace directory was
  // recreated without going through POST /api/projects (e.g. after test cleanup).
  db.exec(`CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    external_id TEXT,
    identifier TEXT,
    title TEXT,
    description TEXT,
    status TEXT,
    agent_state TEXT,
    agent_phase TEXT,
    approx_runtime_minutes INTEGER,
    in_progress_at DATETIME,
    in_review_at DATETIME,
    expected_token_usage INTEGER,
    actual_token_usage INTEGER,
    review_approved_at DATETIME,
    tier TEXT,
    parent_id TEXT,
    assigned_agent_id TEXT,
    document_name TEXT,
    document_type TEXT,
    document_content TEXT,
    document_path TEXT,
    start_date TEXT,
    due_date TEXT,
    vector_embedding BLOB,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    linked_ticket_id TEXT,
    blocked_by TEXT,
    authorized_model TEXT,
    llm_role TEXT
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_external_id ON tickets(external_id) WHERE external_id IS NOT NULL;
  `);

  // Lightweight migration: ensure internal agent columns exist.
  // (SQLite has no ADD COLUMN IF NOT EXISTS, so guard via table_info.)
  try {
    const cols = db.prepare("PRAGMA table_info(tickets)").all() as any[];
    const has = (name: string) => cols.some((c) => c.name === name);
    if (cols.length && !has('agent_state')) db.exec('ALTER TABLE tickets ADD COLUMN agent_state TEXT');
    if (cols.length && !has('agent_phase')) db.exec('ALTER TABLE tickets ADD COLUMN agent_phase TEXT');
    if (cols.length && !has('approx_runtime_minutes')) db.exec('ALTER TABLE tickets ADD COLUMN approx_runtime_minutes INTEGER');
    // Status-change timestamps — set automatically by the PATCH endpoint.
    if (cols.length && !has('in_progress_at')) db.exec('ALTER TABLE tickets ADD COLUMN in_progress_at DATETIME');
    if (cols.length && !has('in_review_at'))   db.exec('ALTER TABLE tickets ADD COLUMN in_review_at DATETIME');
    // Dual-id model: `id` is our own stable local id; `external_id` holds the tracker's
    // (Linear's) id for the same ticket. The two platforms cross-reference each other —
    // Linear stores our id back in its description YAML as `local_id`.
    if (cols.length && !has('external_id')) db.exec('ALTER TABLE tickets ADD COLUMN external_id TEXT');
    if (cols.length) db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_external_id ON tickets(external_id) WHERE external_id IS NOT NULL');
    // `blocking` is derived from other tickets' blocked_by — drop the stored column.
    if (cols.length && has('blocking')) db.exec('ALTER TABLE tickets DROP COLUMN blocking');
    // GitHub Projects sync: stores the GitHub Issue number alongside the local ticket.
    if (cols.length && !has('github_issue_number')) db.exec('ALTER TABLE tickets ADD COLUMN github_issue_number INTEGER');
    // Token governance: approximate before work, actual after completion.
    if (cols.length && !has('expected_token_usage')) db.exec('ALTER TABLE tickets ADD COLUMN expected_token_usage INTEGER');
    if (cols.length && !has('actual_token_usage')) db.exec('ALTER TABLE tickets ADD COLUMN actual_token_usage INTEGER');
    // Review approval tracking: set when the branch is merged via Code Review.
    if (cols.length && !has('review_approved_at')) db.exec('ALTER TABLE tickets ADD COLUMN review_approved_at DATETIME');
  } catch (err: any) {
    console.error('[Registry] Warning: ticket column migration skipped:', err.message);
  }

  // Migrate agent_roles: add personality_vector and default_model columns if missing.
  try {
    const roleCols = db.prepare("PRAGMA table_info(agent_roles)").all() as any[];
    if (roleCols.length && !roleCols.some((c: any) => c.name === 'personality_vector')) {
      db.exec('ALTER TABLE agent_roles ADD COLUMN personality_vector TEXT');
    }
    if (roleCols.length && !roleCols.some((c: any) => c.name === 'default_model')) {
      db.exec('ALTER TABLE agent_roles ADD COLUMN default_model TEXT');
    }
  } catch (err: any) {
    console.error('[Registry] Warning: agent_roles column migration skipped:', err.message);
  }

  // Brainstorming Sandbox graph (Initiative page). Local-first concept graph:
  // UserNode -> brainstorm_nodes, AssociatedWith -> brainstorm_edges.
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS brainstorm_nodes (
      id TEXT PRIMARY KEY,
      title TEXT,
      category TEXT,
      properties TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);
    db.exec(`CREATE TABLE IF NOT EXISTS brainstorm_edges (
      id TEXT PRIMARY KEY,
      from_id TEXT,
      to_id TEXT,
      relationship_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_brainstorm_edges_from ON brainstorm_edges(from_id);');
  } catch (err: any) {
    console.error('[Registry] Warning: brainstorm tables ensure skipped:', err.message);
  }

  // Per-pillar quality scores (0-100) + feedback for the Initiative, regenerated by
  // the Product Management AI Supporter whenever a pillar's brief changes.
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS pillar_scores (
      pillar TEXT PRIMARY KEY,
      score INTEGER,
      feedback TEXT,
      content_hash TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);
    // content_hash lets us skip re-scoring an unchanged pillar (added to existing tables).
    const cols = db.prepare("PRAGMA table_info(pillar_scores)").all() as any[];
    if (cols.length && !cols.some((c: any) => c.name === 'content_hash')) {
      db.exec('ALTER TABLE pillar_scores ADD COLUMN content_hash TEXT');
    }
  } catch (err: any) {
    console.error('[Registry] Warning: pillar_scores ensure skipped:', err.message);
  }

  // Per-ticket fulfillment scores (0-100) + feedback, regenerated whenever the
  // ticket's substance changes. The bar is tier-specific: Epic = WHY, Story = WHAT,
  // Task = HOW, Test = proof the parent Task's definition of done truly works.
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS ticket_scores (
      ticket_id TEXT PRIMARY KEY,
      score INTEGER,
      feedback TEXT,
      content_hash TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);
  } catch (err: any) {
    console.error('[Registry] Warning: ticket_scores ensure skipped:', err.message);
  }

  // Cloud service accounts moved out of the retired system DB into the project DB.
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS service_accounts (
      id TEXT PRIMARY KEY,
      name TEXT,
      platform TEXT,
      iam_roles TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);
  } catch (err: any) {
    console.error('[Registry] Warning: service_accounts ensure skipped:', err.message);
  }

  // Ticket comments synced from the tracker (Linear). Filterable by ticket_id.
  // Attachments are stored as a JSON array of { name, path, url }; the files
  // themselves live under DocsAssets/attachments/ (Files & Assets).
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      author TEXT,
      body TEXT,
      attachments TEXT,
      source TEXT DEFAULT 'linear',
      created_at DATETIME,
      updated_at DATETIME
    );`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_comments_ticket ON comments(ticket_id);');
  } catch (err: any) {
    console.error('[Registry] Warning: comments ensure skipped:', err.message);
  }

  // Evidence attachments for test tickets (UnitTest / QA). Required before a
  // branch can be approved and merged. Files live at <workspace>/Tickets/Evidence/.
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS ticket_evidence (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT,
      caption TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_ticket_evidence_ticket ON ticket_evidence(ticket_id);');
  } catch (err: any) {
    console.error('[Registry] Warning: ticket_evidence ensure skipped:', err.message);
  }

  // GitHub PRs synced from local merge-reviews (one row per ticket-branch + repo).
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS ticket_prs (
      identifier TEXT,
      repo TEXT,
      number INTEGER,
      url TEXT,
      state TEXT,
      message TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (identifier, repo)
    );`);
  } catch (err: any) {
    console.error('[Registry] Warning: ticket_prs ensure skipped:', err.message);
  }

  // Per-ticket AI chat thread — persists the full conversation for each ticket.
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS ticket_chat (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_ticket_chat ON ticket_chat(ticket_id);');
  } catch (err: any) {
    console.error('[Registry] Warning: ticket_chat ensure skipped:', err.message);
  }

  try {
    db.exec(`CREATE TABLE IF NOT EXISTS feedback_posts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      author TEXT,
      ticket_id TEXT,
      ticket_identifier TEXT,
      ticket_tier TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);
  } catch (err: any) {
    console.error('[Registry] Warning: feedback_posts ensure skipped:', err.message);
  }

  // Model registry — persists discovered models and per-model dry-run status.
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS available_models (
      id TEXT PRIMARY KEY,
      provider_id TEXT,
      name TEXT,
      type TEXT,
      dry_run_status TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);
    const amCols = db.prepare("PRAGMA table_info(available_models)").all() as any[];
    if (amCols.length && !amCols.some((c: any) => c.name === 'dry_run_status')) {
      db.exec('ALTER TABLE available_models ADD COLUMN dry_run_status TEXT');
    }
  } catch (err: any) {
    console.error('[Registry] Warning: available_models ensure skipped:', err.message);
  }

  try {
    const loadExtension = eval('require');
    const sqliteVec = loadExtension('sqlite-vec');
    sqliteVec.load(db);
  } catch (err: any) {
    console.error('[Registry] Warning: Vector search failed to initialize for project:', err.message);
  }

  activeProjectDb = db;
  currentProjectRoot = root;
  activeDbIno = currentIno;
  return activeProjectDb;
}

function requireProjectDb(): Database.Database {
  const pdb = getProjectDb();
  if (!pdb) throw new Error('No active workstation selected — open or create one first.');
  return pdb;
}

/**
 * Database proxy. Every query targets the active workstation's project DB.
 */
export const db = {
  prepare: (sql: string) => requireProjectDb().prepare(sql),
  exec: (sql: string) => requireProjectDb().exec(sql),
  transaction: (fn: any) => requireProjectDb().transaction(fn),
  pragma: (sql: string) => requireProjectDb().pragma(sql),
} as any;
