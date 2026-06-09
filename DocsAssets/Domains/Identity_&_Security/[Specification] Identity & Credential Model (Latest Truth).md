---
title: Identity & Credential Model
type: specification
domain: Identity_&_Security
status: latest-truth
owner_role: security-engineer
last_reviewed: 2026-06-04
related:
  - ../../Global/Briefs/Identity_&_Security.md
  - ../../Global/Guardrails/Identity_&_Security_Guardrails.md
  - ./[Runbook] Incident Response.md
---

# Identity & Credential Model (Latest Truth)

The security model enabling high-integrity, agent-driven development.

## 1. Access model
Default-deny; per-task scopes; JIT ephemeral credentials issued at provisioning and revoked
at teardown/timeout. The sandbox VFS mounts only `allow_read` / `allow_write`.

## 2. Credential & data matrices
Per-role entitlements (which services/secrets a role may receive) are governed here;
detailed legacy matrices: root `05-gcp-credential-matrix.md`, `06-data-accessibility-matrix.md`.

## 3. Identity lifecycle
Agents and humans share one lifecycle — provisioning, rotation, revocation — but agents
hold distinct, non-shared identities. Legacy detail: root `12-identity-lifecycle.md`.

## 4. Secret rotation & compromise
Rotation cadence and compromise response: root `14-secret-rotation-and-compromise.md`.
Compromise triggers immediate revocation + sandbox teardown
([`[Runbook] Incident Response.md`](./[Runbook]%20Incident%20Response.md)).

## 5. Chain of custody
Every commit/build/deploy is cryptographically signed and traced to ticket + identity; CI
verifies only `allow_write` changed.

## 6. AI egress & privacy sovereignty
Providers are DPA-governed secure network extensions; sensitive tasks default to the on-prem
rack / local LLM. Egress is mediated by `network-proxy/`.

## 7. Compliance
Obligations: root `15-compliance-and-data-operations.md`.
