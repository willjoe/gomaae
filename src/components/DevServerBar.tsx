'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Square, Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type DevStatus = 'stopped' | 'starting' | 'running' | 'error';

export default function DevServerBar() {
  const [status, setStatus] = useState<DevStatus>('stopped');
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/dev-server');
      const data = await res.json();
      setStatus(data.status);
      setUrl(data.url);
      setError(data.error);
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Poll while starting so the URL appears as soon as it's detected.
  useEffect(() => {
    if (status === 'starting') {
      pollRef.current = setInterval(fetchStatus, 1500);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [status]);

  const toggle = async () => {
    setBusy(true);
    try {
      const action = status === 'stopped' || status === 'error' ? 'start' : 'stop';
      await fetch('/api/dev-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      await fetchStatus();
    } finally {
      setBusy(false);
    }
  };

  const isRunning = status === 'running';
  const isStarting = status === 'starting';

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-border bg-card text-xs">
      {/* Status dot */}
      <div className={cn(
        'w-2 h-2 rounded-full shrink-0',
        isRunning  && 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]',
        isStarting && 'bg-amber-500 animate-pulse',
        status === 'stopped' && 'bg-muted-foreground/40',
        status === 'error'   && 'bg-red-500',
      )} />

      {/* Label */}
      <span className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground shrink-0">
        Dev Server
      </span>

      {/* URL link — visible only when running */}
      {isRunning && url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
        >
          {url}
          <ExternalLink size={10} />
        </a>
      )}

      {isStarting && (
        <span className="font-mono text-[11px] text-amber-500 italic">Starting…</span>
      )}

      {status === 'error' && error && (
        <span className="font-mono text-[11px] text-red-500 truncate max-w-xs" title={error}>
          {error}
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Toggle button */}
      <button
        onClick={toggle}
        disabled={busy || isStarting}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tighter transition-all disabled:opacity-40',
          isRunning
            ? 'bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20'
            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20',
        )}
      >
        {busy || isStarting
          ? <Loader2 size={10} className="animate-spin" />
          : isRunning
            ? <Square size={10} />
            : <Play size={10} />}
        {isRunning ? 'Stop' : isStarting ? 'Starting' : 'Start'}
      </button>
    </div>
  );
}
