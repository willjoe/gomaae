---
title: User Personas
type: brief
domain: Global
status: latest-truth
owner_role: growth-pm
last_reviewed: 2026-06-04
related:
  - ./Product_Overview.md
---

# User Personas

## The Architect / Technical PM
Defines atomic tickets with machine-readable scopes, roles, models, token ceilings. Authors
Briefs, Guardrails, Specifications, and ADRs. Cares about scoping correctness and chain-of-custody integrity.

## The Human Engineer
Executes scoped tickets in ephemeral sandboxes; reviews agent output. Wants fast
provisioning, clear scope, low-friction verification.

## The AI Agent (first-class user)
Autonomous engineer with its own ephemeral identity, bound to a role and task scope. Reads
context from `*.agent_state` / `vector.json`; produces code, governed docs, and evidences;
held to the same security rules as humans.

## The Delivery / Ops Manager
Tracks tickets across the phase lifecycle; owns runbooks; watches the Agent Monitor for
execution health and token burn.

## The Security / Identity Engineer
Owns credential/identity matrices, egress policy, incident response; approves the
Identity_&_Security domain specs.
