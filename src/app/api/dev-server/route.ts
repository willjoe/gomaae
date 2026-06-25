import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';
import { getActiveRepoPath } from '@/lib/db';

type DevStatus = 'stopped' | 'starting' | 'running' | 'error';

// Module-level state — survives across requests within the sidecar process.
let proc: ChildProcess | null = null;
let status: DevStatus = 'stopped';
let devUrl: string | null = null;
let errorMsg: string | null = null;

function parseUrl(line: string): string | null {
  const m = line.match(/https?:\/\/(?:localhost|\d{1,3}(?:\.\d{1,3}){3}):\d+/);
  return m ? m[0] : null;
}

function startServer(repoPath: string): void {
  if (proc) return;
  status = 'starting';
  devUrl = null;
  errorMsg = null;

  // Login shell so nvm/Homebrew PATH entries are available.
  const shell = process.env.SHELL || '/bin/zsh';
  proc = spawn(shell, ['-l', '-c', 'npm run dev'], {
    cwd: repoPath,
    detached: true,  // lets the child survive if the parent pauses; also enables killpg
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const onData = (chunk: Buffer) => {
    const text = chunk.toString();
    if (!devUrl) {
      const found = text.split('\n').map(parseUrl).find(Boolean);
      if (found) {
        devUrl = found;
        status = 'running';
      }
    }
  };

  proc.stdout?.on('data', onData);
  proc.stderr?.on('data', onData);

  proc.on('error', (err) => {
    status = 'error';
    errorMsg = err.message;
    proc = null;
  });

  proc.on('close', (code) => {
    // If we never detected a URL and the process died, treat as error.
    if (status !== 'stopped') {
      status = code === 0 ? 'stopped' : 'error';
    }
    proc = null;
    devUrl = null;
  });

  // Fallback: if URL not detected after 30s, assume default port.
  setTimeout(() => {
    if (status === 'starting') {
      devUrl = 'http://localhost:3000';
      status = 'running';
    }
  }, 30000);
}

function stopServer(): void {
  if (!proc) { status = 'stopped'; return; }
  try {
    // Kill the process group so npm's child (next) is also terminated.
    if (proc.pid) process.kill(-proc.pid, 'SIGTERM');
  } catch {
    proc.kill('SIGTERM');
  }
  proc = null;
  status = 'stopped';
  devUrl = null;
}

export async function GET() {
  return NextResponse.json({ status, url: devUrl, error: errorMsg });
}

export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    if (action === 'start') {
      const repoPath = getActiveRepoPath();
      if (!repoPath) {
        return NextResponse.json({ success: false, error: 'No active workspace configured.' }, { status: 400 });
      }
      startServer(repoPath);
      return NextResponse.json({ success: true, status });
    }

    if (action === 'stop') {
      stopServer();
      return NextResponse.json({ success: true, status });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
