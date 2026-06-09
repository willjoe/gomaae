---
title: Agent_Roles Guardrails
type: guardrails
domain: Agent_Roles
status: latest-truth
owner_role: ai-pm
last_reviewed: 2026-06-04
related:
  - ../Briefs/Agent_Roles.md
---

# Agent_Roles — Guardrails

## Autonomy granted
Refine deliverables and default scopes for existing roles.

## Hard constraints (do not cross)
- A role's default scope must never exceed its credential entitlement.
- Role slugs are stable identifiers; never rename in place (add + supersede the domain instead).

## Metric constraints
Keep the registry lean — adding a new role requires a documented capability gap.

## Required reviews
Creating a new role or widening any role's entitlement → `security-engineer` + `ai-pm` sign-off.

## Out of scope
Issuing credentials; persisting per-task agent state.
