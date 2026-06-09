---
title: Agent_Orchestration Brief
type: brief
domain: Agent_Orchestration
status: latest-truth
owner_role: ai-pm
last_reviewed: 2026-06-04
related:
  - ../Guardrails/Agent_Orchestration_Guardrails.md
  - ../../Domains/Agent_Orchestration/[Specification] Orchestration Requirements (Latest Truth).md
---

# Agent_Orchestration — Strategy Brief

## 1. Problem (Why)
AI agents must execute tickets autonomously and asynchronously without standing access or
manual babysitting, and without pipeline stalls when a provider is down.

## 2. Outcome (What)
An event-driven orchestrator that provisions a scoped, ephemeral worker per ticket, runs
the assigned model with a resilient fallback chain, and tears everything down on completion.

## 3. Target users
Human Engineers and AI Agents executing tickets; Delivery/Ops managers monitoring runs.

## 4. Scope
**In:** activation webhook, JIT provisioning, sandbox VFS, worker lifecycle, model
fallback. **Out:** ticket modeling (Ticketing), credential issuance internals (Identity_&_Security).

## 5. Success metrics
Provisioning < 60s; zero out-of-scope file access; 100% task continuity across provider
fallback; token burn within ceiling.

## 6. Key risks & dependencies
Depends on Identity_&_Security (JIT creds) and Knowledge_&_Context (portable state).
Risk: local-fallback hardware capacity under load.
