import fs from 'fs';
import os from 'os';
import path from 'path';
import yaml from 'js-yaml';

/**
 * Core application configuration stored in an OS-standard, user-writable directory
 * so it survives app bundle updates and works correctly in both dev and production:
 *
 *   macOS  : ~/Library/Application Support/com.gomaae.app/config.yaml
 *   Linux  : ~/.config/gomaae/config.yaml
 *   Windows: %APPDATA%\gomaae\config.yaml
 *
 * In production (Tauri sidecar), GOMAAE_DATA_DIR is set by lib.rs to the
 * Tauri-resolved app_data_dir, which maps to the same OS path shown above.
 *
 * This is the source of truth for GLOBAL settings only:
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

function getDataDir(): string {
  if (process.env.GOMAAE_DATA_DIR) return process.env.GOMAAE_DATA_DIR;
  if (process.platform === 'darwin')
    return path.join(os.homedir(), 'Library', 'Application Support', 'com.gomaae.app');
  if (process.platform === 'win32')
    return path.join(process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming'), 'gomaae');
  return path.join(os.homedir(), '.config', 'gomaae');
}

const DATA_DIR = getDataDir();
const CONFIG_PATH = path.join(DATA_DIR, 'config.yaml');
const DEFAULTS: AppConfig = { appearance: 'system', language: 'English', workstations: [] };

export function readConfig(): AppConfig {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const parsed = (yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8')) || {}) as Partial<AppConfig>;
      return { ...DEFAULTS, ...parsed, workstations: parsed.workstations ?? [] };
    } catch { /* corrupt file -> reset to defaults below */ }
  }
  const seeded: AppConfig = { ...DEFAULTS, workstations: [] };
  writeConfig(seeded);
  return seeded;
}

export function writeConfig(cfg: AppConfig): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
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
  if (ws.active) {
    cfg.workstations.forEach((w) => { w.active = false; });
  }
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
