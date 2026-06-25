import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db, getActiveProjectId } from '@/lib/db';
import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execFileP = promisify(execFile);
const TEST_PROMPT = 'Reply with one word: ready';
const CLI_TIMEOUT_MS = 20000;
const API_TIMEOUT_MS = 12000;

function cliEnv(): NodeJS.ProcessEnv {
  const home = os.homedir();
  const extra = [
    `${home}/.local/bin`, `${home}/bin`, '/opt/homebrew/bin', '/opt/homebrew/sbin',
    '/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin',
  ];
  const existing = (process.env.PATH || '').split(':').filter(Boolean);
  return { ...process.env, PATH: [...new Set([...extra, ...existing])].join(':') };
}

function raceTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

async function testAnthropicCLI(): Promise<'ok' | 'fail'> {
  try {
    await raceTimeout(
      execFileP('claude', ['-p', TEST_PROMPT, '--model', 'haiku'], { env: cliEnv(), maxBuffer: 512 * 1024 }),
      CLI_TIMEOUT_MS,
    );
    return 'ok';
  } catch { return 'fail'; }
}

async function testAnthropicAPI(modelId: string, key: string): Promise<'ok' | 'fail'> {
  try {
    const res = await raceTimeout(
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: modelId, max_tokens: 5, messages: [{ role: 'user', content: TEST_PROMPT }] }),
      }),
      API_TIMEOUT_MS,
    );
    const data = await res.json();
    return data.error ? 'fail' : 'ok';
  } catch { return 'fail'; }
}

async function testGoogleCLI(): Promise<'ok' | 'fail'> {
  try {
    const child = await raceTimeout(
      new Promise<{ ok: boolean }>((resolve) => {
        const cp = require('child_process').spawn(
          'agy', ['-p', TEST_PROMPT, '--model', 'gemini-2.0-flash-lite', '--dangerously-skip-permissions'],
          { env: cliEnv() },
        );
        cp.on('close', (code: number) => resolve({ ok: code === 0 }));
        cp.on('error', () => resolve({ ok: false }));
      }),
      CLI_TIMEOUT_MS,
    );
    return child.ok ? 'ok' : 'fail';
  } catch { return 'fail'; }
}

async function testGoogleAPI(modelId: string, key: string): Promise<'ok' | 'fail'> {
  try {
    const res = await raceTimeout(
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: TEST_PROMPT }] }] }),
      }),
      API_TIMEOUT_MS,
    );
    const data = await res.json();
    return data.error ? 'fail' : 'ok';
  } catch { return 'fail'; }
}

async function testOpenAI(modelId: string, key: string): Promise<'ok' | 'fail'> {
  try {
    const res = await raceTimeout(
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: modelId, max_tokens: 5, messages: [{ role: 'user', content: TEST_PROMPT }] }),
      }),
      API_TIMEOUT_MS,
    );
    const data = await res.json();
    return data.error ? 'fail' : 'ok';
  } catch { return 'fail'; }
}

async function testOllama(modelId: string, settings: Record<string, string>): Promise<'ok' | 'fail'> {
  try {
    const modelName = modelId.replace('ollama-', '') || 'llama3';
    if (settings.ollama_cli_active === 'true') {
      await raceTimeout(
        execFileP('ollama', ['run', modelName, TEST_PROMPT, '--nowordwrap'], { env: cliEnv(), maxBuffer: 512 * 1024 }),
        CLI_TIMEOUT_MS,
      );
      return 'ok';
    }
    const host = settings.ollama_host || process.env.OLLAMA_HOST || 'http://localhost:11434';
    const res = await raceTimeout(
      fetch(`${host}/api/generate`, {
        method: 'POST',
        body: JSON.stringify({ model: modelName, prompt: TEST_PROMPT, stream: false }),
      }),
      API_TIMEOUT_MS,
    );
    const data = await res.json();
    return data.response ? 'ok' : 'fail';
  } catch { return 'fail'; }
}

export async function POST() {
  try {
    if (!getActiveProjectId()) {
      return NextResponse.json({ success: false, error: 'No active project' }, { status: 400 });
    }

    const models = db.prepare('SELECT id, provider_id as providerId, name, type FROM available_models').all() as any[];
    if (!models.length) {
      return NextResponse.json({ success: true, tested: 0, ok: 0, failed: 0 });
    }

    const rows = db.prepare('SELECT key, value FROM project_settings').all() as any[];
    const settings: Record<string, string> = {};
    (rows as any[]).forEach((r) => { settings[r.key] = r.value; });

    const anthropicKey = settings.anthropic_api_key && settings.anthropic_api_key !== 'cli_managed_proxy'
      ? settings.anthropic_api_key : null;
    const googleKey = settings.google_api_key && settings.google_api_key !== 'cli_managed_proxy'
      ? settings.google_api_key : null;
    const openaiKey = settings.openai_api_key || null;

    // CLI providers: one auth check per binary, shared across all CLI-managed models.
    let claudeCLIResult: 'ok' | 'fail' | null = null;
    let agyCLIResult: 'ok' | 'fail' | null = null;

    const needsClaudeCLI = settings.anthropic_cli_active === 'true' &&
      models.some((m) => m.providerId === 'anthropic');
    const needsAgyCLI = settings.google_cli_active === 'true' &&
      models.some((m) => m.providerId === 'google');

    [claudeCLIResult, agyCLIResult] = await Promise.all([
      needsClaudeCLI ? testAnthropicCLI() : Promise.resolve(null),
      needsAgyCLI ? testGoogleCLI() : Promise.resolve(null),
    ]);

    // Test each model (CLI models reuse the per-binary result above).
    const results = await Promise.allSettled(
      models.map(async (m): Promise<{ id: string; status: 'ok' | 'fail' }> => {
        const { id, providerId } = m;
        let status: 'ok' | 'fail';

        if (providerId === 'anthropic') {
          if (claudeCLIResult !== null) status = claudeCLIResult;
          else if (anthropicKey) status = await testAnthropicAPI(id, anthropicKey);
          else status = 'fail';
        } else if (providerId === 'google') {
          if (agyCLIResult !== null) status = agyCLIResult;
          else if (googleKey) status = await testGoogleAPI(id, googleKey);
          else status = 'fail';
        } else if (providerId === 'openai') {
          status = openaiKey ? await testOpenAI(id, openaiKey) : 'fail';
        } else if (providerId === 'ollama') {
          status = await testOllama(id, settings);
        } else {
          status = 'fail';
        }

        return { id, status };
      }),
    );

    const update = db.prepare('UPDATE available_models SET dry_run_status = ? WHERE id = ?');
    db.transaction(() => {
      results.forEach((r) => {
        if (r.status === 'fulfilled') update.run(r.value.status, r.value.id);
        else if (r.status === 'rejected') {
          // extract id from the rejected promise if possible — just skip
        }
      });
    })();

    const ok = results.filter((r) => r.status === 'fulfilled' && (r as any).value.status === 'ok').length;
    const failed = results.filter((r) => r.status === 'fulfilled' && (r as any).value.status === 'fail').length;

    return NextResponse.json({ success: true, tested: models.length, ok, failed });
  } catch (err: any) {
    console.error('[API dry-run POST]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
