import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

const meta = {
  title: 'Organisms/UpdateBanner',
  parameters: { layout: 'fullscreen' },
};

export default meta;

// UpdateBanner is gated behind window.__TAURI_INTERNALS__ — it renders null
// outside the desktop shell. This story renders the visual HTML directly so
// the design can be reviewed in Storybook without Tauri.
export const UpdateAvailable: StoryObj = {
  render: () => (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 bg-indigo-600 px-6 py-3 text-white shadow-lg">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">A new version is available</span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-mono">v0.1.50</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="rounded-lg bg-white/10 px-4 py-1.5 text-xs font-semibold hover:bg-white/20">
          Later
        </button>
        <button className="rounded-lg bg-white px-4 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-white/90">
          Install &amp; Restart
        </button>
      </div>
    </div>
  ),
};

export const Downloading: StoryObj = {
  render: () => (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 bg-indigo-600 px-6 py-3 text-white shadow-lg">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">Downloading update…</span>
        <div className="h-1.5 w-32 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full w-3/5 rounded-full bg-white/80 animate-pulse" />
        </div>
      </div>
    </div>
  ),
};
