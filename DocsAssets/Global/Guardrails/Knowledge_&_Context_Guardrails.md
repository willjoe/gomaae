---
title: Knowledge_&_Context Guardrails
type: guardrails
domain: Knowledge_&_Context
status: latest-truth
owner_role: ml-engineer
last_reviewed: 2026-06-04
related:
  - ../Briefs/Knowledge_&_Context.md
---

# Knowledge_&_Context — Guardrails

## Autonomy granted
Evolve the `*.agent_state` schema and vector layout; tune retrieval.

## Hard constraints (do not cross)
- Context format must remain provider-independent (no cloud-proprietary memory APIs).
- Never embed secrets or out-of-scope file contents in state/vectors.

## Metric constraints
Context payload sized to fit the smallest approved local-fallback window (e.g. Llama 3.1 8B / 128k); hydration < 5s.

## Required reviews
Schema changes that affect orchestrator hydration → `mlops-engineer` review.

## Out of scope
Choosing/booting models; defining roles.
