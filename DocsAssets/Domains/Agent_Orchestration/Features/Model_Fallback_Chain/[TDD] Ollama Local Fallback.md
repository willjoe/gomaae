---
title: Ollama Local Fallback
type: tdd
domain: Agent_Orchestration
status: latest-truth
owner_role: mlops-engineer
last_reviewed: 2026-06-04
related:
  - ../../[TDD] Worker Lifecycle & Fallback Matrix (Latest Truth).md
  - ./[QA] Fallback Test Cases.md
---

# [TDD] Ollama Local Fallback

## 1. Design summary
When all cloud providers fail or the network is partitioned, the orchestrator repoints the
agent's API base URL to a local Ollama server that mimics the OpenAI API format.

## 2. Components & data flow
`base_url → http://internal-gpu-server:11434/v1`. The agent re-issues its last request;
context is rehydrated from `*.agent_state`. Model chosen by hardware tier.

## 3. Edge cases & failure modes
- Ollama cold start → boot timeout budget 30s; surface a retry, not a task failure.
- Context exceeds local window → truncate per Knowledge_&_Context sizing rules.
- Partial cloud recovery mid-task → stay local until task boundary to avoid thrash.

## 4. Test strategy
See [`[QA] Fallback Test Cases.md`](./[QA]%20Fallback%20Test%20Cases.md). Evidences in
`./Evidences/`.
