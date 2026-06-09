---
title: Identity_&_Security Brief
type: brief
domain: Identity_&_Security
status: latest-truth
owner_role: security-engineer
last_reviewed: 2026-06-04
related:
  - ../Guardrails/Identity_&_Security_Guardrails.md
  - ../../Domains/Identity_&_Security/[Specification] Identity & Credential Model (Latest Truth).md
---

# Identity_&_Security — Strategy Brief

## 1. Problem (Why)
Agents and humans need to act with least privilege, no standing access, and a verifiable
trail — while still letting approved AI providers process data lawfully.

## 2. Outcome (What)
Default-deny access with JIT ephemeral credentials, per-task scope enforcement,
cryptographic chain of custody, and DPA-governed AI egress with on-prem/local defaults for
sensitive work.

## 3. Target users
Security/Identity engineers (owners); every agent and human (subjects); auditors.

## 4. Scope
**In:** identity lifecycle, credential matrices, egress policy, custody signing, incident
response. **Out:** ticket scoping definition (Ticketing); sandbox mechanics (Agent_Orchestration).

## 5. Success metrics
Zero standing credentials; 100% signed commits/builds; mean credential revocation < 10s on
teardown; zero unauthorized egress.

## 6. Key risks & dependencies
Depends on the Identity system and `network-proxy/`. Risk: credential leakage across the
fallback boundary.
