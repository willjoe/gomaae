---
title: Incident Response
type: runbook
domain: Identity_&_Security
status: latest-truth
owner_role: devops-engineer
last_reviewed: 2026-06-04
related:
  - ./[Specification] Identity & Credential Model (Latest Truth).md
---

# [Runbook] Incident Response

Responding to security/execution incidents involving agents, sandboxes, or credentials.
Legacy detail: root `11-incident-response-and-patching.md`, `14-secret-rotation-and-compromise.md`.

## Triggers
- Suspected credential compromise (agent or human).
- An agent diff touching files outside its authorized scope.
- Anomalous egress or token-burn spikes.

## Steps
1. **Contain** — stop the implicated worker; freeze the ticket.
2. **Revoke** — invalidate the agent's ephemeral JIT credentials.
3. **Isolate** — tear down the sandbox VFS; preserve `*.agent_state` for forensics.
4. **Rotate** — rotate any secrets the agent could have reached.

## Verification
Trace the offending commit/build to ticket + identity via the chain of custody; confirm
scope violation in CI diff-verification logs.

## Rollback / recovery
Re-provision under a fresh identity and corrected scope; author a blameless postmortem and,
if procedures changed, update this runbook (bump `last_reviewed`).
