---
title: HQ Deployment
type: runbook
domain: Control_Plane_UI
status: latest-truth
owner_role: devops-engineer
last_reviewed: 2026-06-04
related:
  - ./[Specification] HQ Web UI (Latest Truth).md
---

# [Runbook] HQ Deployment

Build and deploy the Agentic Engineering HQ control plane (`agent-orchestrator-hq`).

## Triggers
A release of the control plane, or a config/image change to ship.

## Prerequisites
Docker available; access to `/var/run/docker.sock`; API keys + Git credentials set in HQ Settings.

## Steps
- **Dev:** `docker compose -f agent-orchestrator-hq/docker-compose.dev.yml up`; verify
  dashboard loads and SQLite initializes (`init-db.js`).
- **Prod:** build from `agent-orchestrator-hq/Dockerfile`; `docker compose -f
  agent-orchestrator-hq/docker-compose.prod.yml up -d`.
- **Desktop:** Tauri build from `src-tauri/`.

## Verification
Smoke-test dashboard, ticket detail, and agent-monitor log streaming.

## Rollback
Redeploy the previous tagged image; SQLite migrations must be backward-safe. Policy: root
`09-production-environments-and-delivery.md`, `13-iac-promotion-and-teardown.md`.
