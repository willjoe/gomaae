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

function getProjectDb(): Database.Database | null {
  const root = getActiveProjectRoot();
  if (!root) return null;

  if (activeProjectDb && currentProjectRoot === root) {
    return activeProjectDb;
  }

  // Connect to the active project's DB.
  const projectDbPath = path.join(root, 'Tickets', 'project.db');
  const ticketsDir = path.dirname(projectDbPath);
  if (!fs.existsSync(ticketsDir)) fs.mkdirSync(ticketsDir, { recursive: true });

  const db = new Database(projectDbPath);
  db.pragma('journal_mode = WAL');

  // Lightweight migration: ensure internal agent columns exist.
  // (SQLite has no ADD COLUMN IF NOT EXISTS, so guard via table_info.)
  try {
    const cols = db.prepare("PRAGMA table_info(tickets)").all() as any[];
    const has = (name: string) => cols.some((c) => c.name === name);
    if (cols.length && !has('agent_state')) db.exec('ALTER TABLE tickets ADD COLUMN agent_state TEXT');
    if (cols.length && !has('agent_phase')) db.exec('ALTER TABLE tickets ADD COLUMN agent_phase TEXT');
    // `blocking` is derived from other tickets' blocked_by — drop the stored column.
    if (cols.length && has('blocking')) db.exec('ALTER TABLE tickets DROP COLUMN blocking');
  } catch (err: any) {
    console.error('[Registry] Warning: ticket column migration skipped:', err.message);
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

  try {
    const loadExtension = eval('require');
    const sqliteVec = loadExtension('sqlite-vec');
    sqliteVec.load(db);
  } catch (err: any) {
    console.error('[Registry] Warning: Vector search failed to initialize for project:', err.message);
  }

  activeProjectDb = db;
  currentProjectRoot = root;
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
