---
title: Knowledge_&_Context Brief
type: brief
domain: Knowledge_&_Context
status: latest-truth
owner_role: ml-engineer
last_reviewed: 2026-06-04
related:
  - ../Guardrails/Knowledge_&_Context_Guardrails.md
  - ../../Domains/Knowledge_&_Context/[Specification] Context Handoff & State (Latest Truth).md
---

# Knowledge_&_Context — Strategy Brief

## 1. Problem (Why)
Agents must resume work on any model — cloud or local — without proprietary cloud memory,
so a provider outage or fallback never loses task context.

## 2. Outcome (What)
Standardized, provider-independent context: `*.agent_state` markdown for running task
state and `vector.json` role/feature vectors that any model can hydrate from.

## 3. Target users
Agents (read/write context); orchestrator (rehydrates on fallback); Architects (seed context).

## 4. Scope
**In:** state file format, context vectors, retrieval. **Out:** model execution
(Agent_Orchestration); role definitions (Agent_Roles).

## 5. Success metrics
100% task continuity across model swaps; context hydration < 5s; zero proprietary-memory dependence.

## 6. Key risks & dependencies
Depends on `knowledge/` vectors. Risk: stale or oversized context degrading local-model performance.
