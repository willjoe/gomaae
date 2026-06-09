---
title: Control_Plane_UI Brief
type: brief
domain: Control_Plane_UI
status: latest-truth
owner_role: core-pm
last_reviewed: 2026-06-04
related:
  - ../Guardrails/Control_Plane_UI_Guardrails.md
  - ../../Domains/Control_Plane_UI/[Specification] HQ Web UI (Latest Truth).md
---

# Control_Plane_UI — Strategy Brief

## 1. Problem (Why)
Humans need a single surface to monitor, assign, and validate AI-driven work across local
and remote environments.

## 2. Outcome (What)
A Next.js control plane: Dashboard, Ticket Detail (model + role), Agent Monitor (live
logs), Settings, and in-app rendering of governed `DocsAssets/` docs.

## 3. Target users
Delivery/Ops managers, Architects/PMs, engineers reviewing agent output.

## 4. Scope
**In:** UI/UX, API routes, log streaming, doc rendering. **Out:** orchestration logic
(Agent_Orchestration); auth/credentials internals (Identity_&_Security).

## 5. Success metrics
Live log latency < 2s; all governed docs render with correct status; zero hardcoded design values (tokens only).

## 6. Key risks & dependencies
Depends on Design_System and the Next.js build's breaking changes (read
`node_modules/next/dist/docs/`). Risk: UI drift from Latest-Truth specs.
