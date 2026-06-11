import { db } from '../db';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileP = promisify(execFile);
const BIG = { maxBuffer: 10 * 1024 * 1024 };

function setting(key: string): string | null {
  try {
    return (db.prepare('SELECT value FROM project_settings WHERE key = ?').get(key) as any)?.value ?? null;
  } catch {
    return null;
  }
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

  if (modelId.startsWith('claude')) {
    if (setting('anthropic_cli_active') === 'true') {
      const flag = modelId.includes('sonnet') ? 'sonnet' : modelId.includes('opus') ? 'opus' : modelId.includes('haiku') ? 'haiku' : modelId;
      const { stdout } = await execFileP('claude', ['-p', prompt, '--model', flag], BIG);
      return stdout.trim();
    }
    const key = setting('anthropic_api_key') || process.env.ANTHROPIC_API_KEY;
    if (!key || key === 'cli_managed_proxy') throw new Error('Anthropic API key not configured.');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: modelId, max_tokens: 2048, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'Anthropic error');
    return data.content?.[0]?.text || '';
  }

  if (modelId.startsWith('gemini')) {
    if (setting('google_cli_active') === 'true') {
      const { stdout } = await execFileP('gemini', ['-m', modelId, prompt], BIG);
      return stdout.trim();
    }
    const key = setting('google_api_key') || process.env.GOOGLE_API_KEY;
    if (!key || key === 'cli_managed_proxy') throw new Error('Google API key not configured.');
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
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
      body: JSON.stringify({ model: modelId, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'OpenAI error');
    return data.choices?.[0]?.message?.content || '';
  }

  if (modelId.startsWith('ollama')) {
    const model = modelId.replace('ollama-', '') || 'llama3';
    if (setting('ollama_cli_active') === 'true') {
      const { stdout } = await execFileP('ollama', ['run', model, prompt], BIG);
      return stdout.trim();
    }
    const host = setting('ollama_host') || process.env.OLLAMA_HOST || 'http://localhost:11434';
    const res = await fetch(`${host}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({ model, prompt, stream: false }),
    });
    const data = await res.json();
    return data.response || '';
  }

  throw new Error(`Unknown AI engine: ${modelId}`);
}
