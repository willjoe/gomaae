---
title: Shared Data Model
type: specification
domain: Global
status: latest-truth
owner_role: data-architect
last_reviewed: 2026-06-08
related:
  - ./[Specification] System Architecture (Latest Truth).md
  - ../../Domains/Ticketing/[Specification] Ticket Model & Lifecycle (Latest Truth).md
---

# Shared Data Model (Latest Truth)

Cross-domain entities. **Core config** is a global `config.yaml` at the app root
(workstation registry + appearance/language). **Per-workstation state** lives in that
workstation's path: tickets in `<path>/Tickets/project.db` (SQLite). The local SQLite stays
authoritative; external systems sync on top. Domain-private fields are documented in the
owning domain's spec.

## Entities

### Ticket
Owned by **Ticketing**.
- **Standard / sync-safe:** `identifier`, `title`, `description`, `status`
  (`Backlog`|`To Do`|`In Progress`|`In Review`|`Done`), `tier`
  (`Epic`|`Story`|`Task`|`UnitTest`|`QA`|`Triage`), `llm_role`, `authorized_model`,
  `repository`, `acceptance_criteria`, `start_date`, `due_date`.
- **Hierarchy / dependencies:** `parent_id`; `blocked_by` (comma-separated identifiers, the
  only stored edge — "blocking" is derived); `linked_ticket_id` (a test ticket's target).
- **Orchestration sub-state (separate from `status`):** `agent_state`
  (`Queued`|`Running`|null), `agent_phase`
  (`Provisioning`|`Coding`|`Finalizing`|`Committing`|null).

### Agent identity
`agent_id`, `role`, credential handle, sandbox binding. Owned by **Identity_&_Security**;
never shares human credentials.

### Role
`slug`, deliverables, default scopes, credential entitlements, context-vector pointer, single
owning lifecycle. Owned by **Agent_Roles**.

### Execution / worker (container)
A worker is the ticket itself while `agent_state` is set; its live phase is `agent_phase`.
Work is materialized on disk under the standardized `~/Agentic` hierarchy:
- `<workstation>/Repository` — canonical git repo (default branch is the trunk).
- `<workstation>/Workspaces/<TICKET>/repo` — scoped per-ticket clone on branch
  `ticket/<identifier>`. Test tickets reuse their **owner Task's** workspace/branch.
- `<workstation>/Tickets/project.db` — ticket state.
Owned by **Agent_Orchestration**.

## Relationships
A Ticket assigns one Role and one authorized model; while running it owns one scoped
workspace/branch. Test tickets attach to a Task via `linked_ticket_id` and **share that
Task's branch** — a branch review group is all tickets on one branch, merged together. All
mutations are attributable via the chain of custody.
