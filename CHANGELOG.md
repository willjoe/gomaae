# Changelog

All notable changes are documented here. Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

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
