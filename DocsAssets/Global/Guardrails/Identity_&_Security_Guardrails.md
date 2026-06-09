---
title: Identity_&_Security Guardrails
type: guardrails
domain: Identity_&_Security
status: latest-truth
owner_role: security-engineer
last_reviewed: 2026-06-04
related:
  - ../Briefs/Identity_&_Security.md
---

# Identity_&_Security — Guardrails

## Autonomy granted
Tune credential TTLs, rotation cadence, and proxy rules within the constraints below.

## Hard constraints (do not cross)
- No standing or shared credentials; agents never reuse human identities.
- All credentials are ephemeral and revoked at teardown/timeout.
- Sensitive-tagged data must default to the on-prem AI rack or local LLM; never egress without a DPA-covered route.
- Every commit/build/deploy must be cryptographically signed.

## Metric constraints
Credential TTL ≤ task window; revocation ≤ 10s; rotation per `14-secret-rotation-and-compromise.md`.

## Required reviews
Any change to the credential matrix, egress allowlist, or signing trust root → second
`security-engineer` reviewer (4-eyes).

## Out of scope
Defining which files a ticket may touch (Ticketing); container scheduling (Agent_Orchestration).
