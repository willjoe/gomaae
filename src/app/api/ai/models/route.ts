import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db, getActiveProjectId } from '@/lib/db';
const { execSync } = require('child_process');

const KEY_FETCHED_AT = 'models_last_fetched_at';
const KEY_HEALTH = 'models_provider_health';

// Curated Claude models for CLI-managed mode. The Claude CLI has no
// non-interactive "list models" command, and asking the model to enumerate
// itself burns quota and hallucinates. These are the currently active models
// from Anthropic's catalog (June 2026); the CLI accepts them via `--model`.
const CLAUDE_CLI_MODELS = [
  { id: 'claude-fable-5', name: 'Claude Fable 5' },
  { id: 'claude-opus-4-8', name: 'Claude Opus 4.8' },
  { id: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
];

// Curated Antigravity (Google) models for CLI-managed mode. The Antigravity CLI
// (agy) replaced Gemini CLI on 2026-06-20. It supports `agy models` to list
// available models, but the output is interactive/pretty-printed with no
// machine-parseable flag yet. This curated list mirrors the models available
// through Antigravity CLI v1.0.x (June 2026). Unlike Gemini CLI, agy supports
// multi-provider model selection (Gemini, Claude, etc.) — we list only the
// Google-family models here; Claude models are listed under the Anthropic provider.
const ANTIGRAVITY_CLI_MODELS = [
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite' },
  { id: 'gemma-3-27b-it', name: 'Gemma 3 27B IT' },
];

/** Cheap, non-LLM check that a CLI binary is installed and runnable.
 *  Wraps in a login shell so nvm/Homebrew PATH entries are visible even
 *  when the process was launched from a GUI (Tauri) rather than a terminal. */
function cliAvailable(cmd: string): boolean {
  try {
    const shell = process.env.SHELL || '/bin/zsh';
    execSync(`${shell} -l -c "${cmd} --version"`, { timeout: 5000, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/** Best-effort: the Antigravity CLI's stored OAuth access token (used only as a fallback). */
function readAntigravityOAuthToken(): string | null {
  try {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    // Antigravity CLI stores credentials under ~/.gemini/antigravity-cli/
    // Fall back to legacy Gemini CLI path for users who haven't fully migrated.
    const agyPath = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'cache', 'oauth_creds.json');
    const legacyPath = path.join(os.homedir(), '.gemini', 'oauth_creds.json');
    const p = fs.existsSync(agyPath) ? agyPath : legacyPath;
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8')).access_token || null;
  } catch {
    return null;
  }
}

interface GoogleModelsResult {
  models: any[];
  message?: string;
  unauthorized?: boolean;
}

/**
 * Fetch the Gemini/Gemma model list LIVE from Google's Generative Language API —
 * never a hardcoded list. Prefers a real API key; falls back to the Antigravity
 * CLI's OAuth token (best-effort). When neither can list, returns an actionable
 * message instead of inventing models.
 */
async function fetchGeminiModels(config: Record<string, string>): Promise<GoogleModelsResult> {
  const realKey = config.google_api_key && config.google_api_key !== 'cli_managed_proxy' ? config.google_api_key : null;
  let url = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000';
  const headers: Record<string, string> = {};
  if (realKey) {
    url += `&key=${realKey}`;
  } else {
    const token = readAntigravityOAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, { headers });
    const data = await res.json();
    if (Array.isArray(data.models)) {
      const models = data.models
        .filter((m: any) => /(^|\/)(gemini|gemma)/i.test(m.name || '') && (m.supportedGenerationMethods || []).includes('generateContent'))
        .map((m: any) => {
          const id = String(m.name).split('/').pop();
          return { id, providerId: 'google', name: m.displayName || id, type: 'API Live' };
        });
      return models.length ? { models } : { models: [], message: 'Google returned no Gemini models for this credential.' };
    }
    if (data.error) {
      const needKey = !realKey;
      return {
        models: [],
        unauthorized: needKey || data.error.status === 'UNAUTHENTICATED' || data.error.code === 401 || data.error.code === 403,
        message: needKey
          ? 'Add a Google API key on the AI Engine page to list Gemini models (Antigravity CLI OAuth cannot enumerate them).'
          : (data.error.message || 'Google rejected the API key.'),
      };
    }
    return { models: [], message: 'Unexpected response from Google models API.' };
  } catch {
    return { models: [], message: 'Connection to Google failed.' };
  }
}

function readSettings(keys: string[]): Record<string, string> {
  const placeholders = keys.map(() => '?').join(', ');
  const rows = db.prepare(`SELECT key, value FROM project_settings WHERE key IN (${placeholders})`).all(...keys) as any[];
  const map: Record<string, string> = {};
  rows.forEach(r => { map[r.key] = r.value; });
  return map;
}

export async function GET(request: Request) {
  try {
    const projectId = getActiveProjectId();
    if (!projectId) {
      return NextResponse.json({ success: true, models: [], providerHealth: {}, lastFetchedAt: null });
    }

    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';

    // Always read the persisted model list from DB — this is always fast
    const cachedModels = db.prepare('SELECT id, provider_id as providerId, name, type FROM available_models').all();
    const settings = readSettings([KEY_FETCHED_AT, KEY_HEALTH]);
    const lastFetchedAt = settings[KEY_FETCHED_AT] ? parseInt(settings[KEY_FETCHED_AT]) : null;
    const cachedHealth = settings[KEY_HEALTH] ? JSON.parse(settings[KEY_HEALTH]) : {};

    // Fast path: return DB-cached data without running any CLI or external API calls.
    // Drop cached Ollama models if Ollama isn't configured — a stale cache shouldn't
    // surface local llama models the user never set up.
    if (!refresh) {
      const cfg = readSettings(['ollama_host', 'ollama_cli_active']);
      const ollamaConfigured = !!cfg.ollama_host || cfg.ollama_cli_active === 'true' || !!process.env.OLLAMA_HOST;
      const models = ollamaConfigured
        ? cachedModels
        : (cachedModels as any[]).filter(m => m.providerId !== 'ollama');
      return NextResponse.json({
        success: true,
        models,
        providerHealth: cachedHealth,
        lastFetchedAt,
      });
    }

    // === Full discovery path (refresh=true) ===
    const configRows = db.prepare('SELECT * FROM project_settings').all() as any[];
    const config: Record<string, string> = {};
    configRows.forEach(row => { config[row.key] = row.value; });

    const discoveredModels: any[] = [];
    const providerHealth: Record<string, { status: 'ok' | 'error' | 'unauthorized', message?: string }> = {
      anthropic: { status: 'ok' },
      google:    { status: 'ok' },
      openai:    { status: 'ok' },
      ollama:    { status: 'ok' },
    };

    // 1. Anthropic
    if (config.anthropic_cli_active === 'true') {
      // Availability = the CLI is installed and runnable. We intentionally do NOT
      // prompt the model to list itself (burns quota, hallucinates, and a transient
      // rate-limit would wrongly mark Claude "unavailable").
      if (cliAvailable('claude')) {
        CLAUDE_CLI_MODELS.forEach(m =>
          discoveredModels.push({ id: m.id, providerId: 'anthropic', name: m.name, type: 'CLI Managed' }));
      } else {
        providerHealth.anthropic = { status: 'unauthorized', message: 'Claude CLI not found on PATH.' };
      }
    } else if (config.anthropic_api_key && config.anthropic_api_key !== 'cli_managed_proxy') {
      try {
        const res = await fetch('https://api.anthropic.com/v1/models', {
          headers: { 'x-api-key': config.anthropic_api_key, 'anthropic-version': '2023-06-01' },
        });
        const data = await res.json();
        if (data.data) {
          data.data.forEach((m: any) => {
            discoveredModels.push({ id: m.id, providerId: 'anthropic', name: m.display_name || m.id, type: 'API Managed' });
          });
        } else if (data.error) {
          providerHealth.anthropic = { status: 'unauthorized', message: data.error.message };
        }
      } catch {
        providerHealth.anthropic = { status: 'error', message: 'Connection to Anthropic failed.' };
      }
    }

    // 2. Google (Antigravity CLI). The agy CLI replaced Gemini CLI on 2026-06-20.
    //    CLI mode surfaces the curated model list. A real API key gets the full live list.
    if (config.google_cli_active === 'true') {
      if (cliAvailable('agy')) {
        ANTIGRAVITY_CLI_MODELS.forEach((m) =>
          discoveredModels.push({ id: m.id, providerId: 'google', name: m.name, type: 'CLI Managed' }));
      } else {
        providerHealth.google = { status: 'unauthorized', message: 'Antigravity CLI (agy) not found on PATH.' };
      }
    } else if (config.google_api_key && config.google_api_key !== 'cli_managed_proxy') {
      const result = await fetchGeminiModels(config);
      if (result.models.length) result.models.forEach((m) => discoveredModels.push(m));
      else providerHealth.google = { status: result.unauthorized ? 'unauthorized' : 'error', message: result.message };
    }

    // 3. OpenAI
    if (config.openai_api_key) {
      try {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${config.openai_api_key}` },
        });
        const data = await res.json();
        if (data.data) {
          data.data.forEach((m: any) => {
            if (m.id.startsWith('gpt-')) {
              discoveredModels.push({ id: m.id, providerId: 'openai', name: m.id.toUpperCase(), type: 'OpenAI Model' });
            }
          });
        } else if (data.error) {
          providerHealth.openai = { status: 'unauthorized', message: data.error.message };
        }
      } catch {
        providerHealth.openai = { status: 'error', message: 'Connection to OpenAI failed.' };
      }
    }

    // 4. Local Ollama — only when the user has actually configured it. Otherwise we'd
    //    pick up an unrelated Ollama running on the default port and list its models.
    const ollamaConfigured = !!config.ollama_host || config.ollama_cli_active === 'true' || !!process.env.OLLAMA_HOST;
    if (!ollamaConfigured) {
      providerHealth.ollama = { status: 'unauthorized', message: 'Ollama not configured.' };
    } else {
      const ollamaHost = config.ollama_host || process.env.OLLAMA_HOST || 'http://localhost:11434';
      try {
        const res = await fetch(`${ollamaHost}/api/tags`);
        const data = await res.json();
        if (data.models) {
          data.models.forEach((m: any) => {
            discoveredModels.push({
              id: `ollama-${m.name}`,
              providerId: 'ollama',
              name: m.name,
              type: `Local: ${m.details?.parameter_size || 'N/A'}`,
            });
          });
        }
      } catch {
        providerHealth.ollama = { status: 'error', message: 'Ollama node unreachable.' };
      }
    }

    // Persist discovered models
    if (discoveredModels.length > 0) {
      db.transaction(() => {
        db.prepare('DELETE FROM available_models').run();
        const insert = db.prepare('INSERT INTO available_models (id, provider_id, name, type) VALUES (?, ?, ?, ?)');
        discoveredModels.forEach(m => insert.run(m.id, m.providerId, m.name, m.type));
      })();
    }

    // Persist fetch timestamp and health for the fast path
    const now = Date.now();
    const upsert = db.prepare('INSERT OR REPLACE INTO project_settings (key, value) VALUES (?, ?)');
    upsert.run(KEY_FETCHED_AT, now.toString());
    upsert.run(KEY_HEALTH, JSON.stringify(providerHealth));

    const finalModels = db.prepare('SELECT id, provider_id as providerId, name, type FROM available_models').all();

    return NextResponse.json({
      success: true,
      models: finalModels,
      providerHealth,
      lastFetchedAt: now,
    });
  } catch (error: any) {
    console.error('[API Models GET] Critical Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
