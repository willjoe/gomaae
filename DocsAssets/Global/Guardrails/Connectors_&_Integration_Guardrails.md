---
title: Connectors_&_Integration Guardrails
type: guardrails
domain: Connectors_&_Integration
status: latest-truth
owner_role: integration-engineer
last_reviewed: 2026-06-04
related:
  - ../Briefs/Connectors_&_Integration.md
---

# Connectors_&_Integration — Guardrails

## Autonomy granted
Add new connectors and field mappings; tune sync intervals.

## Hard constraints (do not cross)
- SQLite is the source of truth; never let an external system override local state on conflict without an explicit reconciliation rule.
- Store external API credentials only via the Identity_&_Security flow.

## Metric constraints
Sync lag < 30s; respect external rate limits with backoff.

## Required reviews
Adding a new external provider → `security-engineer` review of its credential + egress path.

## Out of scope
Defining ticket fields; performing the actual git branch/commit/PR work.
