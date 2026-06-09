---
title: Evidence & Retention Lifecycle
type: specification
domain: Global
status: latest-truth
owner_role: functional-qa-eng
last_reviewed: 2026-06-04
related:
  - ./Agent Contribution Protocol.md
---

# Evidence & Retention Lifecycle

Test evidences (screenshots, recordings) are **permanent technical assets**, encapsulated
inside each feature's `Evidences/` vault as historical references of how the system
behaves when running perfectly.

## 1. Vault location

```
Domains/<Domain>/Features/<Feature>/Evidences/<Retention_Folder>/
```

`<Retention_Folder>` is a timeframe or release, never an epic/project verb. Examples:
`202606_Initial_Release/`, `2026Q2_Refactoring/`.

## 2. Media naming grammar

`[img|vid]_[test_case_id]_[status]_[timestamp].[ext]`

- **Prefix:** `img_` for static screenshots, `vid_` for screen recordings.
- **test_case_id:** must match a case id in the feature's `[QA]` document (e.g. `tc101`).
- **status:** `success` (expected behavior), `failed` (bug capture/repro), or step
  identifiers `step1`, `step2` … for multi-stage flows.
- **timestamp:** `YYYYMMDD`.

Examples:
- `img_tc101_success_20260603.png`
- `vid_tc102_failed_20260603.mp4`

## 3. Retention lifecycle

**Active phase** (during development + immediate post-release): retain full, high-fidelity
evidences — videos and multi-step screenshots for normal, edge, and error cases — in the
retention folder.

**Archival & thinning phase** (3 months post-release, or at the next major domain overhaul):
- **Video purge:** delete all `_success` recordings (or offload to cold storage). Retain
  only recordings of highly complex asynchronous flows.
- **Image pruning:** drop interstitial `stepN` shots; keep **exactly one final
  `_success` screenshot per test case** as the permanent lightweight visual reference of
  the verified working state. `_failed` captures of historically significant bugs may be
  retained at the owning QA role's discretion.

This optimizes storage while preserving each domain's verified-working visual record.
