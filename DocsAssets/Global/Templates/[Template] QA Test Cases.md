---
title: <Feature> Test Cases
type: qa
domain: <Domain_Noun>
status: latest-truth
owner_role: functional-qa-eng
last_reviewed: <YYYY-MM-DD>
related: []
---

# [QA] <Feature> Test Cases

Each `test_case_id` here is the key evidence files reference
(`img_<id>_<status>_<YYYYMMDD>`). Keep ids stable.

| test_case_id | Title | Type | Steps | Expected result |
|--------------|-------|------|-------|-----------------|
| tc101 | <happy path> | normal | 1. … | <expected> |
| tc102 | <edge> | edge | 1. … | <expected> |
| tc103 | <error handling> | error | 1. … | <expected> |

## Evidence mapping
- `tc101` → `img_tc101_success_<YYYYMMDD>.png`
- `tc102` → `vid_tc102_failed_<YYYYMMDD>.mp4`

Evidence vault: `./Evidences/<Retention_Folder>/`
