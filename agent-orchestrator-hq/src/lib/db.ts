import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { getActiveWorkstation } from './appConfig';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const SYSTEM_DB_PATH = path.join(dataDir, 'system.db');

// Tier 1: System Database (Always open)
const systemDb = new Database(SYSTEM_DB_PATH);

// Initialize System Schema
systemDb.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    workspace_root TEXT,
    is_active INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS service_accounts (
    id TEXT PRIMARY KEY,
    name TEXT,
    platform TEXT,
    iam_roles TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Tier 2: Project Database (Dynamic)
let activeProjectDb: Database.Database | null = null;
let currentProjectRoot: string | null = null;

// The workstation registry now lives in the global config.yaml (see appConfig),
// not the system.db `projects` table.
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

function getProjectDb() {
  const root = getActiveProjectRoot();
  if (!root) return null;

  if (activeProjectDb && currentProjectRoot === root) {
    return activeProjectDb;
  }

  // Connect to the new project DB
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

/**
 * Unified Database Proxy
 * Routes queries to either System or Project DB based on context.
 */
export const db = {
  prepare: (sql: string) => {
    const s = sql.toLowerCase();
    const isSystemTable = s.includes(' projects ') || s.includes(' system_settings ') || s.includes(' service_accounts ');
    const targetDb = isSystemTable ? systemDb : (getProjectDb() || systemDb);
    return targetDb.prepare(sql);
  },
  exec: (sql: string) => {
    const s = sql.toLowerCase();
    const isSystemTable = s.includes(' projects ') || s.includes(' system_settings ') || s.includes(' service_accounts ');
    const targetDb = isSystemTable ? systemDb : (getProjectDb() || systemDb);
    return targetDb.exec(sql);
  },
  transaction: (fn: any) => {
    const targetDb = getProjectDb() || systemDb;
    return targetDb.transaction(fn);
  },
  pragma: (sql: string) => {
    const targetDb = getProjectDb() || systemDb;
    return targetDb.pragma(sql);
  }
} as any;

export { systemDb };
