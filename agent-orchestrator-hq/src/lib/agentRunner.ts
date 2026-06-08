import { execFile } from 'child_process';

/**
 * Real coding-agent execution. Runs the agentic CLI selected on the AI Engine
 * page (Claude Code or Gemini) headlessly inside a ticket's scoped workspace,
 * letting it actually edit files. No simulation — what runs is real.
 */
export interface AgentSpec {
  provider: 'claude' | 'gemini';
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
  const geminiReady = settings['google_cli_active'] === 'true' || settings['gemini_cli_active'] === 'true';

  if (sel.startsWith('claude') && claudeReady) return { provider: 'claude', model: claudeModelFlag(sel), label: `Claude (${claudeModelFlag(sel)})` };
  if ((sel.startsWith('gemini') || sel.startsWith('google')) && geminiReady) return { provider: 'gemini', model: sel.startsWith('gemini') ? sel : undefined, label: sel.startsWith('gemini') ? sel : 'Gemini' };

  // No explicit selection -> first active CLI agent.
  if (claudeReady) return { provider: 'claude', model: 'sonnet', label: 'Claude (sonnet)' };
  if (geminiReady) return { provider: 'gemini', label: 'Gemini' };
  return null;
}

export interface AgentRunResult { ok: boolean; output: string; }

/** Run the agent CLI in `repoDir`, editing files in place. */
export function runCodingAgent(repoDir: string, prompt: string, agent: AgentSpec, timeoutMs = 300000): Promise<AgentRunResult> {
  let cmd: string;
  let args: string[];
  if (agent.provider === 'claude') {
    cmd = 'claude';
    args = ['-p', prompt, '--model', agent.model || 'sonnet', '--dangerously-skip-permissions'];
  } else {
    cmd = 'gemini';
    args = ['-p', prompt, '--approval-mode', 'yolo'];
    if (agent.model) args.push('-m', agent.model);
  }

  return new Promise((resolve) => {
    execFile(cmd, args, { cwd: repoDir, timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, env: process.env }, (err, stdout, stderr) => {
      const output = `${stdout || ''}${stderr ? '\n' + stderr : ''}`.trim();
      resolve({ ok: !err, output });
    });
  });
}
