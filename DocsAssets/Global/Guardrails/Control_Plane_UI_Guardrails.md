---
title: Control_Plane_UI Guardrails
type: guardrails
domain: Control_Plane_UI
status: latest-truth
owner_role: delivery-manager
last_reviewed: 2026-06-04
related:
  - ../Briefs/Control_Plane_UI.md
---

# Control_Plane_UI — Guardrails

## Autonomy granted
Build and restyle screens and API routes; add Storybook stories and e2e tests.

## Hard constraints (do not cross)
- Consume Design_System tokens only — no hardcoded hex/spacing; no impression fonts for prose (use Inter Black 900 for emphasis).
- Read `agent-orchestrator-hq/node_modules/next/dist/docs/` before writing Next.js code (breaking changes from upstream).
- Never display credentials/secrets in logs or UI.

## Metric constraints
Log-stream latency < 2s; Lighthouse a11y ≥ 95 (with `accessibility-qa-eng`).

## Required reviews
New external API key surface in Settings → `security-engineer` sign-off.

## Out of scope
Orchestrator/worker behavior; identity issuance.
