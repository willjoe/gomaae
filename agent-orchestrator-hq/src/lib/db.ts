import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const SYSTEM_DB_PATH = path.join(dataDir, 'system.db');

// Tier 1: System Database (Always open)
const systemDb = new Database(SYSTEM_DB_PATH);

// Tier 2: Project Database (Dynamic)
let activeProjectDb: Database.Database | null = null;
let currentProjectRoot: string | null = null;

export function getActiveProjectId(): string | null {
  try {
    const row = systemDb.prepare('SELECT id FROM projects WHERE is_active = 1 LIMIT 1').get() as any;
    return row ? row.id : null;
  } catch (e) {
    return null;
  }
}

export function getActiveProjectRoot(): string | null {
  try {
    const row = systemDb.prepare('SELECT workspace_root FROM projects WHERE is_active = 1 LIMIT 1').get() as any;
    return row ? row.workspace_root : null;
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
    const isSystemTable = sql.toLowerCase().includes(' projects ') || sql.toLowerCase().includes(' system_settings ');
    const targetDb = isSystemTable ? systemDb : (getProjectDb() || systemDb);
    return targetDb.prepare(sql);
  },
  exec: (sql: string) => {
    const isSystemTable = sql.toLowerCase().includes(' projects ') || sql.toLowerCase().includes(' system_settings ');
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
