---
title: Agent_Orchestration Guardrails
type: guardrails
domain: Agent_Orchestration
status: latest-truth
owner_role: delivery-manager
last_reviewed: 2026-06-04
related:
  - ../Briefs/Agent_Orchestration.md
---

# Agent_Orchestration — Guardrails

## Autonomy granted
Choose container runtime details, fallback ordering among *pre-approved* models, and
sandbox mount mechanics. Ship without sign-off when within metric constraints.

## Hard constraints (do not cross)
- Never mount files outside the ticket's `allow_read` / `allow_write`.
- Never use a model not on the approved list, or route a sensitive task off the on-prem/local tier.
- Never persist credentials beyond the worker lifecycle.

## Metric constraints
- Provisioning ≤ 60s; token burn ≤ ticket `token_ceiling`.
- Local-fallback boot ≤ 30s; no more than 2 cloud-fallback hops before going local.

## Required reviews
Adding a new approved model or a new fallback provider → `security-engineer` sign-off.

## Out of scope
Ticket schema/status semantics (Ticketing); identity issuance (Identity_&_Security).
