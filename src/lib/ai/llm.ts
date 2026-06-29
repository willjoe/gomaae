import { db } from '../db';
import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execFileP = promisify(execFile);
const BIG = { maxBuffer: 10 * 1024 * 1024 };

/**
 * Build an environment object with an augmented PATH so CLI tools installed in
 * user-local directories (e.g. ~/.local/bin, /opt/homebrew/bin) are found when
 * child processes are spawned from the Tauri sidecar, which inherits a minimal
 * launchd PATH that omits those locations.
 */
function cliEnv(): NodeJS.ProcessEnv {
  const home = os.homedir();
  const extra = [
    `${home}/.local/bin`,
    `${home}/bin`,
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
  ];
  const existing = (process.env.PATH || '').split(':').filter(Boolean);
  const merged = [...new Set([...extra, ...existing])].join(':');
  return { ...process.env, PATH: merged };
}

function setting(key: string): string | null {
  try {
    return (db.prepare('SELECT value FROM project_settings WHERE key = ?').get(key) as any)?.value ?? null;
  } catch {
    return null;
  }
}

/** Returns a language instruction prefix when the workspace is set to Japanese. */
function langPrefix(): string {
  const lang = setting('language') || 'English';
  if (lang.includes('Japanese') || lang.includes('日本語')) {
    return '【重要指示】あなたの返答はすべて日本語で行ってください。英語を使用せず、すべてのテキスト（コード以外）を日本語で出力してください。\n\n';
  }
  return '';
}

/**
 * One-shot text generation against the workstation's configured Default AI Engine
 * (the same providers as the Tactical Command chat: Claude / Gemini / GPT / Ollama,
 * CLI or API). CLI paths use execFile (no shell) so prompt content needs no escaping.
 * Throws on a missing/misconfigured engine or a provider error.
 */
export async function generateText(prompt: string): Promise<string> {
  const modelId = setting('default_ai_engine');
  if (!modelId || modelId === 'null' || modelId === 'undefined') {
    throw new Error('No default AI model selected — pick one on the AI Engine page.');
  }

  // Prepend language instruction so all AI outputs respect the workspace locale.
  const localizedPrompt = langPrefix() + prompt;

  if (modelId.startsWith('claude')) {
    if (setting('anthropic_cli_active') === 'true') {
      const flag = modelId.includes('sonnet') ? 'sonnet' : modelId.includes('opus') ? 'opus' : modelId.includes('haiku') ? 'haiku' : modelId;
      const { stdout } = await execFileP('claude', ['-p', localizedPrompt, '--model', flag], { ...BIG, env: cliEnv() });
      return stdout.trim();
    }
    const key = setting('anthropic_api_key') || process.env.ANTHROPIC_API_KEY;
    if (!key || key === 'cli_managed_proxy') throw new Error('Anthropic API key not configured.');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      // 8192 output tokens: structured syntheses (summary + pillars + delegation JSON)
      // overflow 2048 and arrive truncated, which surfaces as a JSON parse failure.
      body: JSON.stringify({ model: modelId, max_tokens: 8192, messages: [{ role: 'user', content: localizedPrompt }] }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'Anthropic error');
    if (data.stop_reason === 'max_tokens') throw new Error('The model response was truncated (max_tokens) — try again or simplify the input.');
    // Models with adaptive thinking prepend a thinking block — find the text block explicitly.
    const textBlock = (data.content || []).find((b: any) => b.type === 'text');
    return textBlock?.text || '';
  }

  if (modelId.startsWith('gemini')) {
    let gKey = setting('google_api_key') || process.env.GOOGLE_API_KEY;

    if (setting('google_cli_active') === 'true' && (!gKey || gKey === 'cli_managed_proxy')) {
      const { spawn } = require('child_process');
      return new Promise<string>((resolve, reject) => {
        const child = spawn('agy', ['--model', modelId, '--print', '--dangerously-skip-permissions'], { env: cliEnv() });
        // Collect raw Buffer chunks before decoding — calling .toString() on each chunk
        // independently corrupts multi-byte UTF-8 sequences (e.g. Japanese) that happen
        // to land across chunk boundaries, turning each partial byte into U+FFFD.
        const chunks: Buffer[] = [];
        child.stdout.on('data', (d: Buffer) => chunks.push(d));
        child.on('close', (code: number) => {
          const out = Buffer.concat(chunks).toString('utf8');
          if (code !== 0) reject(new Error('agy CLI failed with code ' + code));
          else resolve(out.trim());
        });
        child.on('error', reject);
        const instructions = "CRITICAL INSTRUCTION: You are acting as a raw text generator. DO NOT use any tools. DO NOT execute any commands. DO NOT write or read files. Simply output the requested text or JSON immediately without any agentic actions or loops.\n\n";
        child.stdin.write(instructions + localizedPrompt + '\n');
        child.stdin.end();
      });
    } else {
      if (!gKey || gKey === 'cli_managed_proxy') throw new Error('Google API key not configured.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${gKey}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ contents: [{ parts: [{ text: localizedPrompt }] }] }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'Google error');
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  if (modelId.startsWith('gpt-')) {
    const key = setting('openai_api_key') || process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OpenAI API key not configured.');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: modelId, messages: [{ role: 'user', content: localizedPrompt }] }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'OpenAI error');
    return data.choices?.[0]?.message?.content || '';
  }

  if (modelId.startsWith('ollama')) {
    const model = modelId.replace('ollama-', '') || 'llama3';
    if (setting('ollama_cli_active') === 'true') {
      const { stdout } = await execFileP('ollama', ['run', model, localizedPrompt], { ...BIG, env: cliEnv() });
      return stdout.trim();
    }
    const host = setting('ollama_host') || process.env.OLLAMA_HOST || 'http://localhost:11434';
    const res = await fetch(`${host}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({ model, prompt: localizedPrompt, stream: false }),
    });
    const data = await res.json();
    return data.response || '';
  }

  throw new Error(`Unknown AI engine: ${modelId}`);
}
