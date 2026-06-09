---
title: Context Handoff & State
type: specification
domain: Knowledge_&_Context
status: latest-truth
owner_role: ml-engineer
last_reviewed: 2026-06-04
related:
  - ../../Global/Briefs/Knowledge_&_Context.md
  - ../../Global/Guardrails/Knowledge_&_Context_Guardrails.md
  - ../Agent_Orchestration/[TDD] Worker Lifecycle & Fallback Matrix (Latest Truth).md
---

# Context Handoff & State (Latest Truth)

Provider-independent context that lets any model resume a task. Legacy detail: root
`17-ai-context-handoff-and-state.md`.

## 1. Artifacts
- **`*.agent_state`** — markdown files holding running task state, decisions, and next steps.
- **`vector.json` / `knowledge/features_context_vector.json`** — role and feature context vectors.

## 2. Why provider-independent
Because context lives in these standardized files (not proprietary cloud memory), the
orchestrator's fallback chain (cloud → cloud → local Ollama) resumes a task on any model
with no loss.

## 3. Hydration
On (re)provisioning, the worker loads the latest `*.agent_state` and the role's vectors.
Hydration target < 5s.

## 4. Sizing
Context payloads are sized to fit the smallest approved local-fallback window (e.g. Llama
3.1 8B, 128k). Oversized context is truncated per priority before going local.

## 5. Safety
Never embed secrets or out-of-scope file contents in state/vectors.
