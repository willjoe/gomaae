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

    // 1. Anthropic (Curated for production reliability)
    if (config.anthropic_api_key || config.anthropic_oauth_active === 'true' || config.anthropic_cli_active === 'true') {
        allModels.push(
            { id: 'claude-3-5-sonnet-20240620', providerId: 'anthropic', name: 'Claude 3.5 Sonnet', type: 'Vision-Capable' },
            { id: 'claude-3-opus-20240229', providerId: 'anthropic', name: 'Claude 3 Opus', type: 'Reasoning' },
            { id: 'claude-3-haiku-20240307', providerId: 'anthropic', name: 'Claude 3 Haiku', type: 'Fast' }
        );
    }

    // 2. Google Gemini (Updated for CLI v0.45.0 compatibility)
    if (config.google_cli_active === 'true' || config.google_api_key) {
        allModels.push(
            { id: 'gemini-3-flash-preview', providerId: 'google', name: 'Gemini 3 Flash (Preview)', type: 'Next-Gen CLI' },
            { id: 'gemini-2.0-flash-exp', providerId: 'google', name: 'Gemini 2.0 Flash (Exp)', type: 'Multi-modal' },
            { id: 'gemini-1.5-flash', providerId: 'google', name: 'Gemini 1.5 Flash', type: 'Low-latency' }
        );
    }

    // 3. OpenAI
    if (config.openai_api_key) {
        allModels.push(
            { id: 'gpt-4o', providerId: 'openai', name: 'GPT-4o (Omni)', type: 'Generalist' },
            { id: 'gpt-4-turbo', providerId: 'openai', name: 'GPT-4 Turbo', type: 'Reasoning' }
        );
    }

    // 4. Local Ollama (Live fetch from local node)
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
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
        if (config.ollama_cli_active === 'true' || config.ollama_host) {
            allModels.push({ id: 'ollama-llama-3', providerId: 'ollama', name: 'Llama 3 (Offline Fallback)', type: 'Local Edge' });
        }
    }

    return NextResponse.json({ success: true, models: allModels });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
