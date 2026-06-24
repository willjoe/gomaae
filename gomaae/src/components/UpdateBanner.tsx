'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface UpdatePayload {
  version: string;
  notes: string;
}

export default function UpdateBanner() {
  const [update, setUpdate] = useState<UpdatePayload | null>(null);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only active inside the Tauri desktop app.
    if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) return;

    let cancel: (() => void) | undefined;

    // Query whatever Rust stored during the background check — handles the case
    // where the update-available event fired before this listener registered.
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke<UpdatePayload | null>('get_pending_update').then((pending) => {
        if (pending) { setUpdate(pending); setDismissed(false); }
      });
    });

    // Also listen for live events (subsequent checks or fast networks).
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<UpdatePayload>('update-available', (e) => {
        setUpdate(e.payload);
        setDismissed(false);
      }).then((fn) => { cancel = fn; });
    });

    return () => { cancel?.(); };
  }, []);

  if (!update || dismissed) return null;

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('install_update');
      // App restarts — this line is never reached.
    } catch (e) {
      console.error('[updater]', e);
      setInstalling(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex items-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-600 px-4 py-3 text-sm text-white shadow-2xl shadow-blue-900/40 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <Download size={16} className="shrink-0 opacity-80" />
      <span>
        <span className="font-bold">Gomaae {update.version}</span> is ready to install
      </span>
      <button
        onClick={handleInstall}
        disabled={installing}
        className="ml-1 rounded-lg bg-white/20 px-3 py-1 font-semibold hover:bg-white/30 disabled:opacity-60 transition-colors"
      >
        {installing ? 'Installing…' : 'Update & Restart'}
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="rounded-full p-0.5 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
