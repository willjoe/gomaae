import { execFile } from 'child_process';
import os from 'os';

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

/**
 * Real coding-agent execution. Runs the agentic CLI selected on the AI Engine
 * page (Claude Code or Antigravity) headlessly inside a ticket's scoped workspace,
 * letting it actually edit files. No simulation — what runs is real.
 */
export interface AgentSpec {
  provider: 'claude' | 'antigravity';
  model?: string;
  label: string;
}

function claudeModelFlag(sel: string): string {
  if (sel.includes('opus')) return 'opus';
  if (sel.includes('haiku')) return 'haiku';
  return 'sonnet';
}

/** Resolve which coding agent to run from project settings (honors the AI Engine selection). */
export function resolveAgent(settings: Record<string, string>): AgentSpec | null {
  const sel = settings['default_ai_engine'] || '';
  const claudeReady = settings['anthropic_cli_active'] === 'true';
  const agyReady = settings['google_cli_active'] === 'true' || settings['gemini_cli_active'] === 'true';

  if (sel.startsWith('claude') && claudeReady) return { provider: 'claude', model: claudeModelFlag(sel), label: `Claude (${claudeModelFlag(sel)})` };
  if ((sel.startsWith('gemini') || sel.startsWith('google')) && agyReady) return { provider: 'antigravity', model: sel.startsWith('gemini') ? sel : undefined, label: sel.startsWith('gemini') ? sel : 'Antigravity' };

  // No explicit selection -> first active CLI agent.
  if (claudeReady) return { provider: 'claude', model: 'sonnet', label: 'Claude (sonnet)' };
  if (agyReady) return { provider: 'antigravity', label: 'Antigravity' };
  return null;
}

export interface AgentRunResult { ok: boolean; output: string; model?: string; }

// Ordered fallback chain: Antigravity (Gemini models) first, Claude if all Gemini quotas exhausted.
// gemini-2.5-pro confirmed working when gemini-2.5-flash is quota-exhausted.
const ANTIGRAVITY_FALLBACK_MODELS = ['gemini-2.5-pro'];
const CLAUDE_FALLBACK_MODELS = ['haiku', 'sonnet', 'opus'];

function isQuotaError(text: string): boolean {
  return /TerminalQuotaError|quota.*exhausted|exhausted.*quota|QUOTA_EXHAUSTED|rate.?limit/i.test(text);
}

function buildArgs(prompt: string, agent: AgentSpec, modelOverride?: string): { cmd: string; args: string[] } {
  if (agent.provider === 'claude') {
    const model = modelOverride || agent.model || 'sonnet';
    return { cmd: 'claude', args: ['-p', prompt, '--model', model, '--dangerously-skip-permissions'] };
  }
  // Antigravity CLI (agy) replaces Gemini CLI as of 2026-06-20
  const args = ['-p', prompt, '--dangerously-skip-permissions'];
  const model = modelOverride || agent.model;
  if (model) args.push('--model', model);
  return { cmd: 'agy', args };
}

/** Run the agent CLI in `repoDir`, editing files in place.
 *  On quota errors, automatically falls back through Antigravity (Gemini models) → Claude model chain. */
export function runCodingAgent(repoDir: string, prompt: string, agent: AgentSpec, timeoutMs = 300000): Promise<AgentRunResult> {
  function attempt(cmd: string, args: string[]): Promise<{ ok: boolean; out: string }> {
    return new Promise((res) => {
      execFile(cmd, args, { cwd: repoDir, timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, env: cliEnv() }, (err, stdout, stderr) => {
        res({ ok: !err, out: `${stdout || ''}${stderr ? '\n' + stderr : ''}`.trim() });
      });
    });
  }

  async function runWithFallback(): Promise<AgentRunResult> {
    // 1. Try primary model
    const primary = buildArgs(prompt, agent);
    const r0 = await attempt(primary.cmd, primary.args);
    // Only return early if the run succeeded AND there is no quota error in the output.
    // (Some CLI versions exit 0 but emit quota errors in stdout — those must still fall back.)
    if (r0.ok && !isQuotaError(r0.out)) return { ok: r0.ok, output: r0.out, model: agent.model };
    if (!isQuotaError(r0.out)) return { ok: r0.ok, output: r0.out, model: agent.model };

    console.warn(`[agentRunner] quota on ${agent.model || agent.provider}; trying Antigravity fallbacks`);

    // 2. Try remaining Antigravity (Gemini) models
    for (const gm of ANTIGRAVITY_FALLBACK_MODELS) {
      if (gm === agent.model) continue;
      const { cmd, args } = buildArgs(prompt, { provider: 'antigravity', model: gm, label: gm }, gm);
      console.warn(`[agentRunner] fallback attempt: ${gm}`);
      const r = await attempt(cmd, args);
      if (r.ok || !isQuotaError(r.out)) return { ok: r.ok, output: r.out, model: gm };
      console.warn(`[agentRunner] ${gm} also quota-exhausted`);
    }

    // 3. All Antigravity (Gemini) models exhausted — fall back to Claude
    console.warn('[agentRunner] all Antigravity models exhausted; falling back to Claude');
    for (const cm of CLAUDE_FALLBACK_MODELS) {
      const { cmd, args } = buildArgs(prompt, { provider: 'claude', model: cm, label: cm });
      console.warn(`[agentRunner] Claude fallback: ${cm}`);
      const r = await attempt(cmd, args);
      if (r.ok || !isQuotaError(r.out)) return { ok: r.ok, output: r.out, model: `claude-${cm}` };
    }

    return { ok: false, output: 'All models exhausted (quota)', model: 'none' };
  }

  return runWithFallback();
}
