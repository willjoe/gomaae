---
title: Role Registry & Deliverables
type: specification
domain: Agent_Roles
status: latest-truth
owner_role: ai-pm
last_reviewed: 2026-06-08
related:
  - ../../Global/Briefs/Agent_Roles.md
  - ../../Global/Guardrails/Agent_Roles_Guardrails.md
  - ../Identity_&_Security/[Specification] Identity & Credential Model (Latest Truth).md
---

# Role Registry & Deliverables (Latest Truth)

How roles bound an agent's identity, permissions, deliverables, and context.

## 1. Registry
Roles live under `agent-roles/roles/<slug>/`: engineering, QA, product, architecture, data,
security, and operations roles — e.g. `api-engineer`, `frontend-web-eng`,
`mobile-engineer`, `integration-engineer`, `ml-engineer`, `mlops-engineer`,
`data-engineer`, `data-architect`, `cloud-architect`, `business-architect`,
`security-engineer`, `identity-engineer`, `devops-engineer`, `finops-engineer`,
`delivery-manager`, `functional-qa-eng`, `performance-qa-eng`, `accessibility-qa-eng`, and
PM variants (`core-pm`, `ai-pm`, `data-pm`, `growth-pm`).

## 2. What a role defines
- **Deliverables** — artifact types the role owns (legacy: root `03-role-deliverable-matrix.md`).
- **Default scopes** — typical `allow_read` / `allow_write` envelope (≤ credential entitlement).
- **Credential matrix** — entitlements (Identity_&_Security).
- **Context vector** — role knowledge in `vector.json` / `knowledge/features_context_vector.json`.

## 3. Identity & isolation
Agents are first-class users with their own ephemeral identities, cryptographically bound to
their sandbox for the task duration; they never share human credentials.

## 4. Document ownership
A role may own `DocsAssets/` documents via the `owner_role` front-matter field.

## 5. Lifecycle binding (HQ)
In the HQ each role belongs to **exactly one lifecycle** — no role spans two lifecycles. The
Agent Roles & Organization page renders the org chart (root → departments → roles), labels
each role with its lifecycle, and colors the role block by that lifecycle's accent. Ticket
creation fetches the registry filtered to the ticket's lifecycle so the Assigned-Role
dropdown only offers valid roles. The registry is backed by `src/lib/agentRoles.ts`
(`getAgentRoles({ activeOnly, lifecycle })`); Software Engineering includes a **Unit Test
Engineer** that owns the Development-phase `UnitTest` tier.
