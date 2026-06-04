import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db, getActiveProjectId } from '@/lib/db';
const { execSync } = require('child_process');

const KEY_FETCHED_AT = 'models_last_fetched_at';
const KEY_HEALTH = 'models_provider_health';

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

    // Fast path: return DB-cached data without running any CLI or external API calls
    if (!refresh) {
      return NextResponse.json({
        success: true,
        models: cachedModels,
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
      try {
        const stdout = execSync('claude -p "List only the technical model IDs available for use via the --model flag in this CLI, one per line. No other text."').toString();
        stdout.split('\n').forEach((line: string) => {
          const id = line.trim();
          if (id && !id.includes(' ')) {
            discoveredModels.push({ id, providerId: 'anthropic', name: id.toUpperCase(), type: 'CLI Managed' });
          }
        });
      } catch {
        providerHealth.anthropic = { status: 'unauthorized', message: 'Claude CLI authentication failed.' };
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

    // 2. Google Gemini
    if (config.google_cli_active === 'true') {
      try {
        const stdout = execSync('gemini -p "List only the technical model IDs available for use in this CLI, one per line. No other text."').toString();
        stdout.split('\n').forEach((line: string) => {
          const id = line.trim();
          if (id && !id.includes(' ') && !id.includes('Ripgrep')) {
            discoveredModels.push({ id, providerId: 'google', name: id.toUpperCase(), type: 'CLI Managed' });
          }
        });
      } catch {
        providerHealth.google = { status: 'unauthorized', message: 'Gemini CLI authentication failed.' };
      }
    } else if (config.google_api_key && config.google_api_key !== 'cli_managed_proxy') {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${config.google_api_key}`);
        const data = await res.json();
        if (data.models) {
          data.models.forEach((m: any) => {
            if (m.name.includes('gemini')) {
              discoveredModels.push({
                id: m.name.split('/')[1],
                providerId: 'google',
                name: m.displayName || m.name,
                type: m.description?.substring(0, 30) || 'Generative Model',
              });
            }
          });
        } else if (data.error) {
          providerHealth.google = { status: 'unauthorized', message: data.error.message };
        }
      } catch {
        providerHealth.google = { status: 'error', message: 'Connection to Google failed.' };
      }
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

    // 4. Local Ollama
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
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
      if (config.ollama_cli_active === 'true' || config.ollama_host) {
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
