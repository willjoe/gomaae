// This bridge intercepts data requests and routes them to the correct backend.
// In Docker (Web) mode, it routes to Next.js Node API routes (/api/*).
// In Tauri (Desktop) mode, it routes to native Rust commands via IPC.

import { invoke } from '@tauri-apps/api/core';

// Check if we are running inside the Tauri native webview
const isTauriEnv = () => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

/**
 * Universal Data Fetcher
 * @param endpoint The Node.js API route (e.g., 'tickets')
 * @param tauriCommand The equivalent Rust command name (e.g., 'get_tickets')
 * @param payload Optional POST payload
 */
export async function bridgeRequest(endpoint: string, tauriCommand: string, payload?: any) {
  if (isTauriEnv()) {
    // Desktop Mode (Rust IPC)
    try {
      const response = await invoke(tauriCommand, payload);
      // Rust commands should return JSON strings or direct objects
      return typeof response === 'string' ? JSON.parse(response) : response;
    } catch (error) {
      console.error(`[Tauri Bridge Error] ${tauriCommand}:`, error);
      throw error;
    }
  } else {
    // Docker / Web Mode (Node.js API)
    try {
      const url = `/api/${endpoint}`;
      const options: RequestInit = {};
      
      if (payload) {
        options.method = 'POST';
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(payload);
      }

      const res = await fetch(url, options);
      return await res.json();
    } catch (error) {
      console.error(`[Node Bridge Error] /api/${endpoint}:`, error);
      throw error;
    }
  }
}
