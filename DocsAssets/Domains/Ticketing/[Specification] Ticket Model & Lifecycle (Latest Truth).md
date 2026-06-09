---
title: Ticket Model & Lifecycle
type: specification
domain: Ticketing
status: latest-truth
owner_role: core-pm
last_reviewed: 2026-06-08
related:
  - ../../Global/Briefs/Ticketing.md
  - ../../Global/Guardrails/Ticketing_Guardrails.md
  - ../../Global/Architecture_Design/[Specification] Shared Data Model (Latest Truth).md
  - ../Agent_Orchestration/[Specification] Orchestration Requirements (Latest Truth).md
---

# Ticket Model & Lifecycle (Latest Truth)

The atomic-task ticket scopes access, drives orchestration, and anchors the chain of custody.

## 1. Source of truth
A global `config.yaml` at the app root holds the **workstation registry** (name + path,
one marked active) plus appearance/language. Each workstation's tickets live in a
per-workstation SQLite DB at `<workstation-path>/Tickets/project.db` (better-sqlite3).
External systems sync via Connectors_&_Integration; the local SQLite stays authoritative.

## 2. Fields
**Standard (sync-safe):** `identifier`, `title`, `description`, `status`, `tier`,
`assigned_role` (`llm_role`), `authorized_model`, `repository`, `acceptance_criteria`,
`start_date`, `due_date`.

**Hierarchy & dependencies:** `parent_id`; `blocked_by` (comma-separated identifiers — the
only stored dependency edge); `linked_ticket_id` (a test ticket's target).

**Orchestration sub-state (internal, NEVER part of `status`):** `agent_state`
(`Queued` | `Running` | null) and `agent_phase` (`Provisioning` | `Coding` | `Finalizing`
| `Committing` | null).

There is **no `blocking` column** — "blocking" is derived by querying which tickets list
this one in their `blocked_by`, so it can never drift.

## 3. Tiers (lifecycle phases)
`Epic` → Initiative · `Story` → Planning · `Task` → Development · `UnitTest` → Development ·
`QA` → Testing · `Triage` → Release. Identifier prefixes: `EPC`, `TKT` (Story/Task), `UT`,
`QA`, `BUG` (Triage).

## 4. Status machine
Standard, external-sync-compatible statuses only:
`Backlog → To Do → In Progress → In Review → Done` (+ a feedback loop reactivating the
worker). These map cleanly onto Jira/Linear/Asana — orchestration sub-states must **not** be
encoded here (that is what `agent_state`/`agent_phase` are for).

Run flow (the "In Queue" experience is `agent_state`, not a status):

1. **Start** → `agent_state = Queued` (status unchanged; visible immediately as "In Queue").
2. The Agent Assignments queue-drain ignites a queued ticket once it is **unblocked**
   (every `blocked_by` target is `Done`) and any tier gate is satisfied → `status = In Progress`,
   `agent_state = Running`, `agent_phase` cycles Provisioning → Coding → Finalizing → Committing.
3. The agent publishes its branch → `status = In Review`, `agent_state = Stopped`. **In Review
   is an open pull request:** the branch is real in the canonical Repository and diffable.
4. A human **Approve & Merge** merges the branch and sets the ticket (and its branch group —
   §6) to `Done`, which unblocks dependents.

### UnitTest start-gate
A `UnitTest` may be queued anytime but only **ignites once its target Task is In Review**
(its code exists). Until then it sits In Queue exactly like a dependency-blocked ticket. The
gate is enforced in the queue-drain, the Start buttons, and authoritatively in the run route
(which re-queues anything triggered early).

## 5. Atomicity rules
- One ticket = one atomic, independently verifiable change.
- Commits are atomic and prefixed with the ticket `identifier`.
- The agent works only inside its scoped per-ticket workspace clone; the diff scope is the
  enforcement boundary.
- **No simulation.** The agent performs real work (real model, real files, real commits);
  what the UI shows is what actually happened.

## 6. Branch review groups (tests share the Task branch)
Test tickets (`UnitTest`/`QA`) do **not** get their own branch — they are written on the
**same branch as the Task they target** (resolved via `linked_ticket_id`), so there is no
separate merge for them. A *review group* is every ticket sharing one branch
(`ticket/<owner-identifier>`): the code-producing owner plus its test tickets. The HQ shows
one **review card per branch**, and a single **Approve & Merge** that is enabled only when
the branch is *fulfilled* (every member In Review). Approving merges the one branch and moves
**all** members to `Done`.

## 7. Document tasks
A documentation ticket sets its allowed write scope to a `DocsAssets/` path (a domain or
feature folder) and names the document(s) it produces, so the orchestrator can verify the
agent stayed in the governed tree.
