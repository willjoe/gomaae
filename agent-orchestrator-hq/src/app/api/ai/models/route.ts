import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db, getActiveProjectId } from '@/lib/db';
const { execSync } = require('child_process');

export async function GET() {
  try {
    const projectId = getActiveProjectId();
    if (!projectId) return NextResponse.json({ success: true, models: [] });

    const configRows = db.prepare('SELECT * FROM settings WHERE project_id = ?').all(projectId);
    const config: Record<string, string> = {};
    configRows.forEach((row: any) => {
      config[row.key] = row.value;
    });

    const discoveredModels: any[] = [];
    const providerHealth: Record<string, { status: 'ok' | 'error' | 'unauthorized', message?: string }> = {
        anthropic: { status: 'ok' },
        google: { status: 'ok' },
        openai: { status: 'ok' },
        ollama: { status: 'ok' }
    };

    // 1. Anthropic Discovery
    if (config.anthropic_cli_active === 'true') {
        try {
            const stdout = execSync('claude -p "List only the technical model IDs available for use via the --model flag in this CLI, one per line. No other text."').toString();
            stdout.split('\n').forEach((line: string) => {
                const id = line.trim();
                if (id && !id.includes(' ')) {
                    discoveredModels.push({
                        id,
                        providerId: 'anthropic',
                        name: id.toUpperCase(),
                        type: 'CLI Managed'
                    });
                }
            });
        } catch (e: any) {
            providerHealth.anthropic = { status: 'unauthorized', message: 'Claude CLI authentication failed.' };
        }
    } else if (config.anthropic_api_key && config.anthropic_api_key !== 'cli_managed_proxy') {
        try {
            const res = await fetch('https://api.anthropic.com/v1/models', {
                headers: { 
                    'x-api-key': config.anthropic_api_key,
                    'anthropic-version': '2023-06-01'
                }
            });
            const data = await res.json();
            if (data.data) {
                data.data.forEach((m: any) => {
                    discoveredModels.push({
                        id: m.id,
                        providerId: 'anthropic',
                        name: m.display_name || m.id,
                        type: 'API Managed'
                    });
                });
            } else if (data.error) {
                providerHealth.anthropic = { status: 'unauthorized', message: data.error.message };
            }
        } catch (e) {
            providerHealth.anthropic = { status: 'error', message: 'Connection to Anthropic failed.' };
        }
    }

    // 2. Google Gemini Discovery
    if (config.google_cli_active === 'true') {
        try {
            const stdout = execSync('gemini -p "List only the technical model IDs available for use in this CLI, one per line. No other text."').toString();
            stdout.split('\n').forEach((line: string) => {
                const id = line.trim();
                if (id && !id.includes(' ') && !id.includes('Ripgrep')) {
                    discoveredModels.push({
                        id,
                        providerId: 'google',
                        name: id.toUpperCase(),
                        type: 'CLI Managed'
                    });
                }
            });
        } catch (e: any) {
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
                            type: m.description?.substring(0, 30) || 'Generative Model'
                        });
                    }
                });
            } else if (data.error) {
                providerHealth.google = { status: 'unauthorized', message: data.error.message };
            }
        } catch (e) {
            providerHealth.google = { status: 'error', message: 'Connection to Google failed.' };
        }
    }

    // 3. OpenAI Discovery
    if (config.openai_api_key) {
        try {
            const res = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${config.openai_api_key}` }
            });
            const data = await res.json();
            if (data.data) {
                data.data.forEach((m: any) => {
                    if (m.id.startsWith('gpt-')) {
                        discoveredModels.push({
                            id: m.id,
                            providerId: 'openai',
                            name: m.id.toUpperCase(),
                            type: 'OpenAI Model'
                        });
                    }
                });
            } else if (data.error) {
                providerHealth.openai = { status: 'unauthorized', message: data.error.message };
            }
        } catch (e) {
            providerHealth.openai = { status: 'error', message: 'Connection to OpenAI failed.' };
        }
    }

    // 4. Local Ollama Discovery
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
                    type: `Local: ${m.details?.parameter_size || 'N/A'}`
                });
            });
        }
    } catch (e) {
        if (config.ollama_cli_active === 'true' || config.ollama_host) {
            providerHealth.ollama = { status: 'error', message: 'Ollama node unreachable.' };
        }
    }

    // PERSISTENCE: Save discovered models to database
    if (discoveredModels.length > 0) {
        db.transaction(() => {
            db.prepare('DELETE FROM available_models WHERE project_id = ?').run(projectId);
            const insert = db.prepare('INSERT INTO available_models (id, provider_id, name, type, project_id) VALUES (?, ?, ?, ?, ?)');
            discoveredModels.forEach(m => {
                insert.run(m.id, m.providerId, m.name, m.type, projectId);
            });
        })();
    }

    // Retrieve full list from DB (truthful state)
    const finalModels = db.prepare('SELECT id, provider_id as providerId, name, type FROM available_models WHERE project_id = ?').all(projectId);

    return NextResponse.json({ 
        success: true, 
        models: finalModels,
        providerHealth
    });
  } catch (error: any) {
    console.error('[API Models GET] Critical Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
