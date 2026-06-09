---
title: Connectors_&_Integration Brief
type: brief
domain: Connectors_&_Integration
status: latest-truth
owner_role: integration-engineer
last_reviewed: 2026-06-04
related:
  - ../Guardrails/Connectors_&_Integration_Guardrails.md
  - ../../Domains/Connectors_&_Integration/[Specification] External Sync (Latest Truth).md
---

# Connectors_&_Integration — Strategy Brief

## 1. Problem (Why)
Teams already track work in Linear, Jira, or GitHub; the platform must import and stay in
sync without making any external system the source of truth.

## 2. Outcome (What)
Connectors that import existing code/tickets and bidirectionally sync status, comments, and
PRs while SQLite remains authoritative.

## 3. Target users
Teams onboarding existing projects; Ops managers reconciling state.

## 4. Scope
**In:** import, field mapping, status/comment/PR sync. **Out:** ticket semantics
(Ticketing); git execution (Agent_Orchestration).

## 5. Success metrics
Import success ≥ 99%; sync lag < 30s; zero divergence between SQLite truth and mirrored fields.

## 6. Key risks & dependencies
Depends on Ticketing schema and external API rate limits. Risk: webhook/credential drift.
