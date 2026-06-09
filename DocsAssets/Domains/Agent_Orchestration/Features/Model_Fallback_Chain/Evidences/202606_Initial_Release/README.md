# Evidences — 202606_Initial_Release

★ Dedicated test-evidence vault for the **Model_Fallback_Chain** feature. Media files here
are permanent technical assets per
[`Global/Governance/Evidence & Retention Lifecycle.md`](../../../../../../Global/Governance/Evidence%20&%20Retention%20Lifecycle.md).

## Naming grammar
`[img|vid]_[test_case_id]_[status]_[YYYYMMDD].[ext]` — ids match
[`../../[QA] Fallback Test Cases.md`](../../[QA]%20Fallback%20Test%20Cases.md).

## Expected files this release
- `img_tc101_success_20260604.png` — primary model runs, no fallback.
- `vid_tc102_failed_20260604.mp4` — primary outage captured (bug/repro).
- `vid_tc103_success_20260604.mp4` — full chain → local Ollama (complex async; retained past thinning).
- `img_tc104_failed_20260604.png` — token-ceiling halt.

> This README is a placeholder describing the vault. QA agents drop the actual `.png` /
> `.mp4` captures here during the active phase. At the thinning phase (3 months post-release),
> purge `_success` videos except complex async flows, and keep one final `_success`
> screenshot per test case.
