import { NextResponse } from "next/server";
export const dynamic = "force-static";
import { db, getActiveProjectId } from '@/lib/db';

export async function GET() {
  try {
    const projectId = getActiveProjectId();
    if (!projectId) return NextResponse.json({ success: true, models: [] });

    const configRows = db.prepare('SELECT * FROM settings WHERE project_id = ?').all(projectId);
    const config: Record<string, string> = {};
    configRows.forEach((row: any) => {
      config[row.key] = row.value;
    });

    const allModels: any[] = [];

    // 1. Anthropic
    if (config.anthropic_api_key || config.anthropic_oauth_active === 'true' || config.anthropic_cli_active === 'true') {
        allModels.push(
            { id: 'claude-3-5-sonnet-20240620', providerId: 'anthropic', name: 'Claude 3.5 Sonnet', type: 'Vision-Capable' },
            { id: 'claude-3-opus-20240229', providerId: 'anthropic', name: 'Claude 3 Opus', type: 'Reasoning' },
            { id: 'claude-3-sonnet-20240229', providerId: 'anthropic', name: 'Claude 3 Sonnet', type: 'Balanced' },
            { id: 'claude-3-haiku-20240307', providerId: 'anthropic', name: 'Claude 3 Haiku', type: 'Fast' }
        );
    }

    // 2. Google Gemini
    if (config.google_cli_active === 'true') {
        try {
            const { execSync } = require('child_process');
            const stdout = execSync('gemini models list').toString();
            stdout.split('\n').forEach((line: string) => {
                if (line.trim() && !line.includes('ID')) {
                    allModels.push({
                        id: line.trim().split(/\s+/)[0],
                        providerId: 'google',
                        name: line.trim().toUpperCase(),
                        type: 'CLI Managed'
                    });
                }
            });
        } catch (e) {
            allModels.push({ id: 'gemini-1.5-pro', providerId: 'google', name: 'Gemini 1.5 Pro', type: 'CLI Fallback' });
        }
    } else if (config.google_api_key && config.google_api_key !== 'cli_managed_proxy') {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${config.google_api_key}`);
            const data = await res.json();
            if (data.models) {
                data.models.forEach((m: any) => {
                    if (m.name.includes('gemini')) {
                        allModels.push({
                            id: m.name.split('/')[1],
                            providerId: 'google',
                            name: m.displayName || m.name,
                            type: m.description?.substring(0, 30) || 'Generative Model'
                        });
                    }
                });
            }
        } catch (e) {
            console.error('[Models API] Google Fetch Error:', e);
        }
    }

    // 3. OpenAI
    if (config.openai_api_key) {
        try {
            const res = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${config.openai_api_key}` }
            });
            const data = await res.json();
            if (data.data) {
                data.data.forEach((m: any) => {
                    if (m.id.startsWith('gpt-')) {
                        allModels.push({
                            id: m.id,
                            providerId: 'openai',
                            name: m.id.toUpperCase(),
                            type: 'OpenAI Model'
                        });
                    }
                });
            }
        } catch (e) {
            console.error('[Models API] OpenAI Fetch Error:', e);
        }
    }

    // 4. Local Ollama
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    if (config.ollama_cli_active === 'true') {
        try {
            const { execSync } = require('child_process');
            const stdout = execSync('ollama list').toString();
            stdout.split('\n').slice(1).forEach((line: string) => {
                if (line.trim()) {
                    const name = line.split(/\s+/)[0];
                    if (name) {
                        allModels.push({
                            id: `ollama-${name}`,
                            providerId: 'ollama',
                            name: name,
                            type: 'CLI Local'
                        });
                    }
                }
            });
        } catch (e) {
            allModels.push({ id: 'ollama-llama-3', providerId: 'ollama', name: 'Llama 3 (CLI Fallback)', type: 'Local Edge' });
        }
    } else {
        try {
            const res = await fetch(`${ollamaHost}/api/tags`);
            const data = await res.json();
            if (data.models) {
                data.models.forEach((m: any) => {
                    allModels.push({
                        id: `ollama-${m.name}`,
                        providerId: 'ollama',
                        name: m.name,
                        type: `Local: ${m.details?.parameter_size || 'N/A'}`
                    });
                });
            }
        } catch (e) {
            allModels.push({ id: 'ollama-llama-3', providerId: 'ollama', name: 'Llama 3 (Offline Fallback)', type: 'Local Edge' });
        }
    }

    return NextResponse.json({ success: true, models: allModels });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
