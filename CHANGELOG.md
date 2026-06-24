# Changelog

All notable changes are documented here. Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

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
