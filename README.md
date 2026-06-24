# Gomaae (胡麻和え)

A desktop project-management app built around HOU REN SOU (報告・連絡・相談) — the Japanese practice of structured reporting, communication, and consultation — with AI agents acting as the sesame dressing that binds it together.

## What it does

Gomaae gives development teams a single workspace to plan, track, and ship:

- **Ticket hierarchy** — Epics → Stories → Tasks → Tests with Kanban and Gantt views
- **Initiative scoring** — AI-evaluated strategy across 11 product pillars (Vision, Market, UX, Technology, Business Model, Data, Team, Compliance, Go-to-Market, Impact, Execution Risk)
- **Brainstorm sandbox** — napkin-sketch ideas that automatically flow into the Epic backlog
- **Release management** — generate AI-written release notes, collect feedback, and auto-create bug/feature tickets from user reports
- **Branch activity** — git graph for your linked repository
- **Linear sync** — bi-directional ticket sync via the dual-id model
- **Auto-update** — background update checks with one-click install

## Installation

Download the latest release for your platform from the [Releases](../../releases/latest) page:

| Platform | File |
|----------|------|
| macOS (Apple Silicon + Intel) | `Gomaae_*_universal.dmg` |
| Windows | `Gomaae_*_x64-setup.exe` |
| Linux (AppImage) | `Gomaae_*_amd64.AppImage` |
| Linux (deb) | `Gomaae_*_amd64.deb` |

The app checks for updates on every launch and every hour — a banner appears when a new version is available.

## Development

**Requirements:** Node 20, Rust stable, Tauri CLI v2

```bash
npm install
npm run dev          # Next.js dev server on :4000
npx tauri dev        # Tauri shell pointing at :4000
```

**Build a release bundle** (downloads a portable Node runtime automatically):

```bash
npx tauri build
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Tauri shell (Rust)                             │
│  • Window management, system menu, auto-updater │
│  • Spawns Node sidecar on launch                │
└────────────────────┬────────────────────────────┘
                     │ IPC (invoke / events)
┌────────────────────▼────────────────────────────┐
│  Next.js standalone server (Node sidecar)       │
│  • All app UI and API routes                    │
│  • SQLite via better-sqlite3 (per-workspace DB) │
│  • Linear sync, AI scoring, git graph           │
└─────────────────────────────────────────────────┘
```

- **Database**: SQLite at `<workspace>/Tickets/project.db` — one file per workstation
- **Config**: `config.yaml` at `sidecar-dist/` — lists workstations and UI prefs
- **Linear**: dual-id model — local `id` + Linear `external_id` kept in sync

## Tech stack

- [Tauri v2](https://v2.tauri.app) — desktop shell
- [Next.js](https://nextjs.org) — UI and API (served as a Node sidecar in production)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — local database
- [Anthropic Claude](https://anthropic.com) — AI scoring and content generation

## License

MIT — see [LICENSE](LICENSE).
