# Changelog

All notable changes are documented here. Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

---

## [0.1.32] — 2026-06-25

### Added
- **Repository Directory** field in Workspace Properties — set any local git repo path directly instead of relying on the `<workspace>/Repository/` subfolder convention; no additional config files needed
- **AI model badge** on every commit in Branch Activity — commits authored with Claude show a ✦ badge with the model name, parsed from the `Co-Authored-By` git trailer
- **GitHub login guidance** panel — when git cannot access the remote due to missing credentials, the Branch Activity shows a `gh auth login` command and retry button instead of a blank list
- **Missing repo path** notice — when `repo_path` points to a non-existent directory the UI explains what to fix and links to Workspace Properties

### Changed
- `getActiveRepoPath()` is now the single source of truth for where repos live; all repository API routes (`/api/repository`, `/api/repository/repos`, `/api/repository/graph`) use it instead of hardcoding `<workspace>/Repository/`
- Updated gomaae workspace `repo_path` → `/Users/will/Code/high-integrity-atomic-development` so Branch Activity shows real commits

---

## [0.1.31] — 2026-06-25

### Changed
- Initiative page is now the default landing page; Planning moved to `/planning`
- Removed the bottom-right AI agent chat panel (TacticalCommandChat) from all page layouts; the component and stories file have been deleted
- Logo: sesame seeds narrowed to 2/3 previous width; all spinach greens shifted 10% lighter

---

## [0.1.30] — 2026-06-25

### Fixed
- "Auto-update failed: Command install_update not allowed by ACL" — custom app commands (`install_update`, `get_pending_update`) are now declared in `src-tauri/permissions/updater-commands.toml` so Tauri v2's ACL engine recognises them; removed the invalid `core:allow-*` entries that were causing the build to fail and the commands to be silently blocked at runtime

---

## [0.1.29] — 2026-06-25

### Added
- Gomaae logo and app icon: spinach bundle (12 overlapping green paths) with 6 teardrop sesame seeds at clock positions 12/2/4/6/8/10 representing the 6 strategic pillars, on a cream plate background
- All platform icon sizes regenerated (macOS ICNS, Windows ICO, iOS, Android) from the new SVG source

### Fixed
- Initiative pillar cards now render markdown in the summary line — `**bold**`, `*italic*`, `code` show correctly instead of raw syntax
- Strategic Pillar Wizard now has a Write / Preview toggle so content can be previewed as rendered markdown before saving

---

## [0.1.28] — 2026-06-25

### Fixed
- CI: `apt-get update` no longer exits 100 on ubuntu-22.04 when Microsoft package repos return 403 — use `--ignore-missing || true` so the Linux build continues

---

## [0.1.27] — 2026-06-25

### Fixed
- Branch Activity (and all workspace-dependent features) now work correctly in both dev and production:
  - `config.yaml` is now stored in the OS-standard user-writable app data directory (`~/Library/Application Support/com.gomaae.app/` on macOS) instead of `process.cwd()`, which pointed into the read-only app bundle in production and failed silently
  - In production (Tauri sidecar), `GOMAAE_DATA_DIR` is now passed to the Node process by lib.rs so the path resolves consistently via Tauri's `app_data_dir()` API
  - `writeConfig` creates the data directory if it doesn't exist (needed on first launch)
  - Migrated existing workstation config from `gomaae/config.yaml` to the new standard location

---

## [0.1.26] — 2026-06-25

### Fixed
- "Update & Restart" button no longer silently resets when installation fails — the actual error message is now shown below the banner with a "Download manually" link to the GitHub releases page
- `install_update` Rust command now surfaces descriptive errors at each step (endpoint parse, updater build, update check, download/install) instead of opaque failures; if the check finds no update (stale PendingUpdate state), the stored payload is cleared so the banner hides
- Added download progress logging to the system log during the install step

---

## [0.1.25] — 2026-06-24

### Added
- Ticket creation modal is now double-width with a two-column layout: existing manual fields on the left, an AI instruction panel on the right separated by a vertical "or" divider
- Right panel: free-text textarea labeled "Instruct or provide feedback to the AI Agent to create a ticket" — describe what you need in plain language and the AI generates the title, description, status, and role automatically
- Tier-aware AI context: Story → feature, Task → bug fix or technical improvement, Epic → strategic goal, QA → test ticket, Triage → ad-hoc; placeholder hints update per tier
- Footer button switches from `+ Create <Tier>` to `✦ Generate & Create <Tier>` (violet) when the AI textarea has content
- New `POST /api/tickets/generate` endpoint backs the AI path using the workspace's configured AI engine

---

## [0.1.24] — 2026-06-24

### Fixed
- Update banner now appears when a new version is available — the loading shell navigates to `http://127.0.0.1:41730/` but the Tauri capability only listed `http://localhost:41730/*`, so the IPC bridge rejected every `invoke('get_pending_update')` call silently; added `127.0.0.1:41730/*` alongside `localhost:41730/*` in `capabilities/default.json`

---

## [0.1.23] — 2026-06-24

### Fixed
- Initiative page pillar scores now appear reliably:
  - Previous polling stopped after only 12 s; LLM scoring calls take 20–60 s, so scores arrived after the poll had already quit — raised the stable-poll timeout to ~100 s (25 × 4 s)
  - The "all done" early-exit checked `Object.values(scores).every(Boolean)`, which is always true when the values are objects — so as soon as any score existed in the DB the poll never started for the missing ones; replaced with an accurate server-side hash check in `score-missing` that returns `triggered: 0` when all content is already scored
  - `BRIEF_FILE_MAP` exported from `initiative-scoring.ts` so `score-missing` can do the same filename→pillar lookup and hash comparison that `scoreBriefFile` does internally

---

## [0.1.22] — 2026-06-24

### Fixed
- App no longer black-screens on launch — the Node.js/V8 sidecar crashed with "Fatal process OOM in Failed to reserve virtual memory for CodeRange" because macOS's hardened runtime blocked JIT memory allocation; fixed by adding `com.apple.security.cs.allow-jit` and `com.apple.security.cs.disable-library-validation` entitlements to the sidecar binary during code signing

---

## [0.1.18] — 2026-06-24

### Fixed
- Initiative pillar scoring now works when the default AI engine is Claude Opus 4.8 or any model with adaptive thinking — response content was taken from `content[0]` blindly, but thinking models prepend a thinking block, so the text block was never found and every score silently failed
- Score polling on the Initiative page no longer runs indefinitely when some briefs are empty — now stops after 3 consecutive stable polls (~12 s with no new scores arriving)

### Security
- Removed `process.env.LINEAR_API_KEY` and `process.env.LINEAR_TEAM_ID` fallbacks from sync daemon — Linear credentials are now stored exclusively in each workspace's `project.db` and entered via the Tracker connection wizard
- Rewrote git history to remove previously committed Linear API keys

### Changed
- Agent Roles page now has a Default AI Model selector per role — replaces the per-ticket "Mandated Model" field; `authorized_model` is derived automatically from the assigned role at run time
- Auto-start toggle on Agent Assignments page now persists across sessions and immediately queues all current Todo tickets when switched on

---

## [0.1.17] — 2026-06-24

### Added
- Agent Roles: Default AI Model selector (System Default / Claude / Gemini / GPT / Ollama) per role, saved to `agent_roles.default_model`
- Context Vector JSON preview in the Agent Roles panel reflects the live model selection

### Changed
- Removed per-ticket "Mandated Model" display from Ticket Detail and Assignment Row
- `authorized_model` is now derived from the role's `default_model` at assignment time, not set manually

### Fixed
- Auto-start toggle loads its persisted state on page mount (previously always reset to off)
- Toggling auto-start ON immediately queues all current Todo tickets

---

## [0.1.16] — 2026-06-24

### Fixed
- Auto-update banner now actually appears — Tauri IPC was silently blocked once the loading shell redirected to `http://localhost:41730`; fixed by adding `remote.urls` to the capability config
- Production log file now written to `~/Library/Logs/com.gomaae.app/` for easier debugging

### Added
- Windows release support (CI uses `windows-2022` to avoid VS 2025 / node-gyp issue)
- Update check now retries every hour instead of only at launch
- `latest.json` includes a `windows-x86_64` platform entry for Windows auto-updates

---

## [0.1.15] — 2026-06-24

### Fixed
- `tauri-plugin-log` enabled in production builds so updater errors are visible in the log file
- Updater endpoint added to `tauri.conf.json` plugin config (belt-and-suspenders alongside programmatic Rust call)

### Added
- Hourly background update re-check (previously one-shot at launch)

---

## [0.1.14] — 2026-06-24

### Added
- **Feedback wall** on the Release page — users can submit Bug Reports and Feature Improvements; each auto-generates a triage ticket (Operation → Story → Tasks for bugs, Story for features)
- AI-generated release notes with version/date picker and copy/download buttons

### Fixed
- Window size corrected to 1440×860 initial / 1280×800 minimum (logical pixels for Retina MacBooks)
- TypeScript build error from dead `CustomerFeedbackPanel` referencing removed `OpsTicket` type

---

## [0.1.13] — 2026-06-21

### Added
- **Kanban board** view toggle on the Planning page (alongside Gantt)
- Epic status guard: new brainstorm ideas create a new Epic when any existing Epic has progressed past Backlog

---

## [0.1.12] — 2026-06-21

### Fixed
- Initiative page polling loop — `setInterval` type error causing CI build failure
- Branch Activity now shows full git history (removed stale `.git` short-circuit logic)

---

## [0.1.11] — 2026-06-21

### Fixed
- `simple-git` replaced with `execFileSync('/usr/bin/git')` in the graph API route — dynamic `require()` is not captured by the Next.js bundler in standalone mode
- macOS menu bar added (View → Reload ⌘R, standard Edit/Window items)

---

## [0.1.10] — 2026-06-20

### Added
- Initiative scoring bootstrap endpoint — triggers AI scoring for all brief files that have content but no score yet
- Initiative page polls every 4 s until all 11 pillars are scored

---

## [0.1.9] — 2026-06-20

### Added
- Dual-id Linear sync model (`id` local + `external_id` Linear)
- Brainstorm sandbox graph (nodes + edges) stored in `project.db`
- Per-pillar strategy scores with content-hash dedup (prevents re-scoring unchanged content)
- Auto-update on launch with `UpdateBanner` component and `get_pending_update` polling

---

## [0.1.1 – 0.1.8] — 2026-06

Initial desktop app iterations: Tauri shell, Node sidecar architecture, ticket hierarchy (Epic/Story/Task/Test), Linear sync, git branch activity, ticket detail with comments, evidence attachments, and AI chat per ticket.
