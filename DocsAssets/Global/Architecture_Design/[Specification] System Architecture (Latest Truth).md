---
title: System Architecture
type: specification
domain: Global
status: latest-truth
owner_role: cloud-architect
last_reviewed: 2026-06-08
related:
  - ./[Specification] Shared Data Model (Latest Truth).md
  - ../../Domains/Agent_Orchestration/[Specification] Orchestration Requirements (Latest Truth).md
  - ../../Domains/Identity_&_Security/[Specification] Identity & Credential Model (Latest Truth).md
---

# System Architecture (Latest Truth)

Top-level architecture of the High-Integrity Atomic Development (HIAD) / Agentic
Engineering platform — the components, their boundaries, and how an atomic task flows from
definition to delivery under a default-deny model. Domain-specific behavior lives in each
domain's spec under `Domains/`.

## 1. Core principles
- **Absolute least privilege** — default-deny; per-task scopes; revoked at teardown.
- **Task-based ephemeral environments** — scoped per-ticket workspace clones, not broad mounts.
- **Contextual isolation** — a task sees only its `allow_read` / `allow_write` files.
- **Cryptographic chain of custody** — every commit/build/deploy signed and traced to ticket + identity.
- **Automated verification** — merges require passing machine-readable acceptance criteria.
- **AI egress / privacy sovereignty** — providers governed by DPAs; sensitive work defaults to on-prem/local LLMs.

## 2. Components → domains

| Component | Implementation | Owning domain |
|-----------|----------------|---------------|
| Orchestrator + workers | HQ route handlers (`/api/tickets/run|commits|merge`), scoped clones under `~/Agentic/<workstation>/Workspaces` | Agent_Orchestration |
| Ticket state | Global `config.yaml` (workstation registry) + per-workstation SQLite `Tickets/project.db` | Ticketing |
| Identity, credentials, egress | Identity system, `network-proxy/` | Identity_&_Security |
| Role registry & context | `agent-roles/roles/`, `vector.json` | Agent_Roles, Knowledge_&_Context |
| Control plane UI/API | `agent-orchestrator-hq` (Next.js) | Control_Plane_UI |
| External sync | `connectors/` | Connectors_&_Integration |

## 3. Atomic task lifecycle
Definition → Activation (Start → `agent_state=Queued`; queue-drain ignites when unblocked +
tier gate ok) → Provisioning (scoped per-ticket clone on `ticket/<owner>`) → Execution (real
coding-agent CLI) → Publish (branch pushed; `In Review` = open PR) → Verification (human
review of the diff) → Merge (Approve & Merge merges the branch group → all members `Done`).
The current single-machine model relies on the scoped clone + diff-scope; container
isolation and JIT credentials remain optional hardening.

## 4. Lifecycle phases
Initiative → Planning → Development → Testing & Review → Operation (see the Control Plane UI
spec for the per-phase boards and theming).

See [`[ADR] 0001 Adopt Global-Domains Workspace.md`](./[ADR]%200001%20Adopt%20Global-Domains%20Workspace.md)
for the documentation-architecture decision.
