import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import Database from 'better-sqlite3';

/**
 * Core application configuration — a single YAML file kept where the app runs
 * (agent-orchestrator-hq/config.yaml). This is the source of truth for GLOBAL
 * settings only:
 *
 *   - appearance (dark/light/system)
 *   - language
 *   - workstations (project name + path + which one is active)
 *
 * Per-workstation settings (API keys, ollama_host, default_ai_engine,
 * selected tickets, etc.) deliberately do NOT live here — they belong under
 * each workspace path in Tickets/project.db -> project_settings.
 */
export interface Workstation {
  id: string;
  name: string;
  description?: string;
  path: string;        // workspace_root, e.g. ~/Agentic/<slug>
  active?: boolean;
}

export interface AppConfig {
  appearance: 'light' | 'dark' | 'system';
  language: string;
  workstations: Workstation[];
}

const CONFIG_PATH = path.join(process.cwd(), 'config.yaml');
const DEFAULTS: AppConfig = { appearance: 'system', language: 'English', workstations: [] };

/** One-time migration: build the YAML from the legacy system.db + active project_settings. */
function seedFromLegacyDb(): AppConfig {
  const cfg: AppConfig = { ...DEFAULTS, workstations: [] };
  try {
    const sysPath = path.join(process.cwd(), 'data', 'system.db');
    if (!fs.existsSync(sysPath)) return cfg;

    const sys = new Database(sysPath, { readonly: true });
    const rows = sys.prepare(
      'SELECT id, name, description, workspace_root, is_active FROM projects ORDER BY created_at DESC',
    ).all() as any[];
    sys.close();

    cfg.workstations = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      path: r.workspace_root,
      active: r.is_active === 1,
    }));

    // appearance/language were previously stored per-project; lift the active
    // project's values up to the global config.
    const active = rows.find((r) => r.is_active === 1);
    if (active?.workspace_root) {
      const pdbPath = path.join(active.workspace_root, 'Tickets', 'project.db');
      if (fs.existsSync(pdbPath)) {
        try {
          const pdb = new Database(pdbPath, { readonly: true });
          const get = (k: string) => (pdb.prepare('SELECT value FROM project_settings WHERE key = ?').get(k) as any)?.value;
          const appearance = get('appearance');
          const language = get('language');
          pdb.close();
          if (appearance) cfg.appearance = appearance;
          if (language) cfg.language = language;
        } catch { /* project_settings may not exist yet */ }
      }
    }
  } catch { /* best-effort migration */ }
  return cfg;
}

export function readConfig(): AppConfig {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const parsed = (yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8')) || {}) as Partial<AppConfig>;
      return { ...DEFAULTS, ...parsed, workstations: parsed.workstations ?? [] };
    } catch { /* corrupt file -> reseed below */ }
  }
  const seeded = seedFromLegacyDb();
  writeConfig(seeded);
  return seeded;
}

export function writeConfig(cfg: AppConfig): void {
  const header =
    '# Core application configuration (global).\n' +
    '# Per-workstation settings live under each workspace path (Tickets/project.db).\n';
  fs.writeFileSync(CONFIG_PATH, header + yaml.dump(cfg, { lineWidth: 120 }));
}

// --- workstations ---
export const getWorkstations = (): Workstation[] => readConfig().workstations;
export const getActiveWorkstation = (): Workstation | null => readConfig().workstations.find((w) => w.active) ?? null;

export function setActiveWorkstation(id: string): void {
  const cfg = readConfig();
  cfg.workstations.forEach((w) => { w.active = w.id === id; });
  writeConfig(cfg);
}

export function upsertWorkstation(ws: Workstation): void {
  const cfg = readConfig();
  const i = cfg.workstations.findIndex((w) => w.id === ws.id);
  if (i >= 0) cfg.workstations[i] = { ...cfg.workstations[i], ...ws };
  else cfg.workstations.push(ws);
  writeConfig(cfg);
}

export function removeWorkstation(id: string): void {
  const cfg = readConfig();
  cfg.workstations = cfg.workstations.filter((w) => w.id !== id);
  writeConfig(cfg);
}

// --- global UI prefs ---
export function setGlobalSettings(patch: Partial<Pick<AppConfig, 'appearance' | 'language'>>): void {
  const cfg = readConfig();
  Object.assign(cfg, patch);
  writeConfig(cfg);
}
