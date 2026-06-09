---
title: Agent_Orchestration Pitch Deck
type: brief
domain: Agent_Orchestration
status: latest-truth
owner_role: ai-pm
last_reviewed: 2026-06-04
related:
  - ../Briefs/Agent_Orchestration.md
  - ../Guardrails/Agent_Orchestration_Guardrails.md
---

# Agent Orchestration — Pitch Deck

> High-level deck built from the Brief + Guardrails as source material. Typography: Inter
> (Black 900) for slide titles; never impression/compressed fonts for body prose.

## Slide 1 — The problem
Autonomous agents can't depend on standing access or a single AI provider.

## Slide 2 — The vision
Event-driven, scoped, ephemeral workers — provisioned per ticket, gone on completion.

## Slide 3 — How it works
`In Progress` → JIT creds → scoped sandbox → run model → verify → teardown.

## Slide 4 — Resiliency
Cloud primary → comparable cloud fallback → air-gapped local LLM (Ollama). Portable
`.agent_state` means any model resumes instantly.

## Slide 5 — Proof
Live evidences in `Domains/Agent_Orchestration/Features/Model_Fallback_Chain/Evidences/`.

## Slide 6 — Guardrails
Provisioning ≤ 60s, token ceiling enforced, never off-scope, never an unapproved model.
