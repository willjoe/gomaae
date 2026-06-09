---
title: Agent_Roles Brief
type: brief
domain: Agent_Roles
status: latest-truth
owner_role: ai-pm
last_reviewed: 2026-06-04
related:
  - ../Guardrails/Agent_Roles_Guardrails.md
  - ../../Domains/Agent_Roles/[Specification] Role Registry & Deliverables (Latest Truth).md
---

# Agent_Roles — Strategy Brief

## 1. Problem (Why)
An agent's permissions, deliverables, and expertise must be bounded by a well-defined role
so scoping and accountability are deterministic.

## 2. Outcome (What)
A role registry where each role defines deliverables, default scopes, credential
entitlements, and a context vector — consumed by Ticketing and Agent_Orchestration.

## 3. Target users
Architects/PMs assigning roles; agents assuming them; security defining entitlements.

## 4. Scope
**In:** role definitions, deliverable matrix, default scope envelopes. **Out:** runtime
credential issuance (Identity_&_Security); context persistence (Knowledge_&_Context).

## 5. Success metrics
Every ticket maps to exactly one registry role; zero deliverables without an accountable role.

## 6. Key risks & dependencies
Depends on credential matrix. Risk: role sprawl diluting least-privilege clarity.
