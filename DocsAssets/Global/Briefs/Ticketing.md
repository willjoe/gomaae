---
title: Ticketing Brief
type: brief
domain: Ticketing
status: latest-truth
owner_role: core-pm
last_reviewed: 2026-06-04
related:
  - ../Guardrails/Ticketing_Guardrails.md
  - ../../Domains/Ticketing/[Specification] Ticket Model & Lifecycle (Latest Truth).md
---

# Ticketing — Strategy Brief

## 1. Problem (Why)
Work must be sliced into atomic, independently verifiable units that also carry the access
scope and acceptance criteria the rest of the system depends on.

## 2. Outcome (What)
A ticket model and status lifecycle that doubles as the security scope and the
chain-of-custody anchor, with SQLite as the local source of truth.

## 3. Target users
PMs/Architects scoping work; agents/engineers executing it; connectors syncing externally.

## 4. Scope
**In:** ticket fields, status machine, atomicity rules. **Out:** orchestration triggered by
status (Agent_Orchestration); external sync transport (Connectors_&_Integration).

## 5. Success metrics
100% of merged diffs stay within `allow_write`; every commit traces to a ticket; zero
ambiguous "needs clarification" bounces.

## 6. Key risks & dependencies
Depends on Shared Data Model. Risk: scope under-specification breaking Zero-Question delegation.
