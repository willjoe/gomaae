'use client';

import { useEffect, useState } from 'react';
import { Download, X, AlertCircle, ExternalLink } from 'lucide-react';
import { bootBus } from '@/lib/bootBus';

const RELEASES_URL = 'https://github.com/willjoe/gomaae/releases/latest';

interface UpdatePayload {
  version: string;
  notes: string;
}

export default function UpdateBanner() {
  const [update, setUpdate] = useState<UpdatePayload | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) return;

    let cancel: (() => void) | undefined;
    let pollCount = 0;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    async function checkPending(): Promise<boolean> {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const pending = await invoke<UpdatePayload | null>('get_pending_update');
        if (pending) {
          setUpdate(pending);
          setDismissed(false);
          return true;
        }
      } catch (e) {
        console.error('[updater] get_pending_update:', e);
      }
      return false;
    }

    // Listen for the Tauri push event immediately — this is zero-cost and we never
    // want to miss a push regardless of boot state.
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<UpdatePayload>('update-available', (e) => {
        clearInterval(pollTimer);
        setUpdate(e.payload);
        setDismissed(false);
        setInstallError(null);
      }).then((fn) => { cancel = fn; });
    });

    // Polling (IPC fallback) starts only after boot-critical fetches settle so it
    // doesn't contend with config/project loads. bootBus defers automatically if
    // boot:ready already fired by the time this effect runs.
    const unsubBoot = bootBus.on('boot:ready', () => {
      checkPending();
      pollTimer = setInterval(async () => {
        pollCount++;
        const found = await checkPending();
        if (found || pollCount >= 18) clearInterval(pollTimer);
      }, 5000);
    });

    return () => {
      cancel?.();
      unsubBoot();
      clearInterval(pollTimer);
    };
  }, []);

  if (!update || dismissed) return null;

  const handleInstall = async () => {
    setInstalling(true);
    setInstallError(null);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('install_update');
      // Successful path ends with handle.restart() on the Rust side — never reaches here.
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      console.error('[updater] install failed:', msg);
      setInstallError(msg);
      setInstalling(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="flex items-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-600 px-4 py-3 text-sm text-white shadow-2xl shadow-blue-900/40">
        <Download size={16} className="shrink-0 opacity-80" />
        <span className="flex-1 min-w-0">
          <span className="font-bold">Gomaae {update.version}</span>
          <span className="opacity-80"> is ready to install</span>
        </span>
        <button
          onClick={handleInstall}
          disabled={installing}
          className="shrink-0 rounded-lg bg-white/20 px-3 py-1 font-semibold hover:bg-white/30 disabled:opacity-60 transition-colors whitespace-nowrap"
        >
          {installing ? 'Installing…' : 'Update & Restart'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-full p-0.5 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>

      {installError && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-950/90 px-4 py-3 text-xs text-red-200 shadow-xl backdrop-blur-sm">
          <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-400" />
          <div className="flex-1 min-w-0 space-y-1">
            <p className="font-semibold text-red-300">Auto-update failed</p>
            <p className="opacity-70 break-words">{installError}</p>
            <a
              href={RELEASES_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200 underline font-medium"
            >
              Download manually <ExternalLink size={11} />
            </a>
          </div>
          <button
            onClick={() => setInstallError(null)}
            className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            aria-label="Dismiss error"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
