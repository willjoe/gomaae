---
title: Ticketing Guardrails
type: guardrails
domain: Ticketing
status: latest-truth
owner_role: delivery-manager
last_reviewed: 2026-06-04
related:
  - ../Briefs/Ticketing.md
---

# Ticketing — Guardrails

## Autonomy granted
Define and evolve ticket fields, validation, and UI within the status machine below.

## Hard constraints (do not cross)
- A ticket must always carry machine-readable `allow_read` / `allow_write` and `acceptance_criteria` before it can reach *In Progress*.
- One ticket = one atomic change; never widen scope mid-execution.
- Status values are fixed: `Draft → Assigned → In Progress → In Review → Done` (+ feedback loop).

## Metric constraints
Ticket-to-activation latency ≤ 5s after status change; scope validation must run pre-activation.

## Required reviews
Changing the status machine or the chain-of-custody contract → `business-architect` sign-off.

## Out of scope
Worker provisioning; credential scoping enforcement (those consume the ticket).
