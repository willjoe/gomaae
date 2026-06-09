---
title: Model Fallback Chain Test Cases
type: qa
domain: Agent_Orchestration
status: latest-truth
owner_role: functional-qa-eng
last_reviewed: 2026-06-04
related:
  - ./[TDD] Ollama Local Fallback.md
---

# [QA] Model Fallback Chain — Test Cases

Evidence files reference these `test_case_id`s
(`[img|vid]_<id>_<status>_<YYYYMMDD>`).

| test_case_id | Title | Type | Steps | Expected result |
|--------------|-------|------|-------|-----------------|
| tc101 | Primary cloud model succeeds | normal | Activate ticket with reachable primary | Task runs on primary; no fallback logged |
| tc102 | Primary down → cloud fallback | edge | Block primary provider; activate | Hops to approved cloud fallback (≤ 2 hops); task completes |
| tc103 | All cloud down → local Ollama | error | Partition network; activate | Repoints to local Ollama; rehydrates state; completes |
| tc104 | Token ceiling enforced | edge | Set low `token_ceiling`; run long task | Worker halts at ceiling; ticket flagged |

## Evidence mapping
- `tc101` → `img_tc101_success_<YYYYMMDD>.png`
- `tc103` → `vid_tc103_success_<YYYYMMDD>.mp4` (complex async flow — retained past thinning)
- `tc104` → `img_tc104_failed_<YYYYMMDD>.png` (ceiling-halt capture)

Vault: `./Evidences/<Retention_Folder>/`
