import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const envFile = path.join(dataDir, 'active-env.json');

export function getActiveEnv(): 'dev' | 'prod' {
  try {
    if (fs.existsSync(envFile)) {
      const data = JSON.parse(fs.readFileSync(envFile, 'utf8'));
      return data.env === 'prod' ? 'prod' : 'dev';
    }
  } catch (e) {}
  return 'dev';
}

export function setActiveEnv(env: 'dev' | 'prod') {
  fs.writeFileSync(envFile, JSON.stringify({ env }));
}

// Separate connections for each environment
let _db_dev: Database.Database | null = null;
let _db_prod: Database.Database | null = null;

function initSchema(db: Database.Database) {
    db.pragma('journal_mode = WAL');
    
    try {
        const loadExtension = eval('require');
        const sqliteVec = loadExtension('sqlite-vec');
        sqliteVec.load(db);
        console.log('[Registry] High-performance vector search (sqlite-vec) initialized successfully.');
    } catch (err: any) {
        console.error('[Registry] Warning: Vector search failed to initialize:', err.message);
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        identifier TEXT,
        title TEXT,
        description TEXT,
        status TEXT,
        tier TEXT,
        parent_id TEXT,
        assigned_agent_id TEXT,
        execution_flag TEXT,
        authorized_model TEXT,
        llm_role TEXT,
        personality_vector TEXT,
        expected_token_usage INTEGER,
        actual_token_usage INTEGER,
        blocked_by TEXT,
        blocking TEXT,
        resource_scope TEXT,
        mutation_scope TEXT,
        ttl DATETIME,
        document_name TEXT,
        document_type TEXT,
        document_content TEXT,
        start_date TEXT,
        due_date TEXT,
        vector_embedding BLOB,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        linked_ticket_id TEXT
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS vec_tickets USING vec0(
        ticket_id TEXT PRIMARY KEY,
        embedding FLOAT[256]
      );

      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT,
        role TEXT,
        llm_provider TEXT,
        container_id TEXT,
        status TEXT
      );

      CREATE TABLE IF NOT EXISTS agent_roles (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id TEXT,
        agent_id TEXT,
        log_line TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS service_accounts (
        id TEXT PRIMARY KEY,
        name TEXT,
        platform TEXT,
        iam_roles TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    return db;
}

function getDb() {
    const env = getActiveEnv();
    if (env === 'prod') {
        if (!_db_prod) {
            const dbPath = process.env.DATABASE_PATH_PROD || path.join(dataDir, 'ticket-manager-prod.db');
            _db_prod = initSchema(new Database(dbPath));
        }
        return _db_prod;
    } else {
        if (!_db_dev) {
            const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'ticket-manager.db');
            _db_dev = initSchema(new Database(dbPath));
        }
        return _db_dev;
    }
}

// Proxy the database commands to the currently active environment connection
export const db = {
    prepare: (sql: string) => getDb().prepare(sql),
    exec: (sql: string) => getDb().exec(sql),
    transaction: (fn: any) => getDb().transaction(fn),
    pragma: (sql: string) => getDb().pragma(sql)
} as any;
