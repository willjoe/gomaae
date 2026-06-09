---
title: Orchestration Requirements
type: specification
domain: Agent_Orchestration
status: latest-truth
owner_role: devops-engineer
last_reviewed: 2026-06-08
related:
  - ../../Global/Briefs/Agent_Orchestration.md
  - ../../Global/Guardrails/Agent_Orchestration_Guardrails.md
  - ../Ticketing/[Specification] Ticket Model & Lifecycle (Latest Truth).md
  - ../Identity_&_Security/[Specification] Identity & Credential Model (Latest Truth).md
---

# Orchestration Requirements (Latest Truth)

The orchestration layer provisions, runs, and tears down AI Agent worker environments as
tickets move through their lifecycle. It runs real work — no simulated/mock steps; the UI
reflects what actually happened.

## 1. Activation model
A human clicks **Start** on a ticket, which sets `agent_state = Queued` (the "In Queue"
sub-state; `status` is unchanged). The **Agent Assignments queue-drain** then ignites a
queued ticket once it is **unblocked** (every `blocked_by` target is `Done`) and any tier
gate is satisfied (e.g. a `UnitTest` waits for its target Task to reach `In Review`).
Ignition transitions `status → In Progress`, `agent_state → Running`.

> Implemented today as the local queue-drain on the active workstation. An event/webhook
> trigger and auto-start toggle remain compatible future hardening.

Ticket metadata contract: `tier`, `llm_role`, `authorized_model`, `blocked_by`,
`linked_ticket_id`.

## 2. Provisioning sequence (scoped clone, no container required)
1. Resolve the **branch owner**: a Task owns `ticket/<identifier>`; a test ticket
   (`UnitTest`/`QA`) resolves to its target Task's branch via `linked_ticket_id`.
2. Materialize a scoped per-ticket clone at `<workstation>/Workspaces/<owner>/repo` from
   `<workstation>/Repository`, on branch `ticket/<owner>` (idempotent; an existing
   published branch is checked out tracking origin so test work joins the Task's commits).
3. `agent_phase` advances Provisioning → Coding → Finalizing → Committing as the run proceeds.
4. The agent commits the real diff and publishes the branch (`push --force origin
   ticket/<owner>`) so **In Review behaves like an open pull request**.

> The scoped clone is the materialized sandbox boundary. Docker-from-Docker and JIT
> credentials remain optional hardening; the current single-machine ("zero-trust product")
> model relies on the scoped clone + diff-scope rather than a per-ticket container.

## 3. Worker lifecycle

| Ticket state | `agent_state` / `agent_phase` | Action |
|--------------|-------------------------------|--------|
| Start (To Do/Backlog) | `Queued` / — | Park in queue; show "In Queue". |
| `In Progress` | `Running` / Provisioning→Coding→Finalizing→Committing | Provision scoped clone; run the coding agent; commit & publish branch. |
| `In Review` | `Stopped` / — | Branch published (open PR); awaiting human review. |
| Feedback / re-run | `Running` | Re-enter the same branch and apply fixes. |
| `Done` | — | Set on **Approve & Merge** (merges the branch; whole branch group → Done). |

## 4. Coding agent & model fallback
The run invokes a real CLI coding agent resolved from the workstation's AI Engine settings —
Claude (`claude -p … --model … --dangerously-skip-permissions`) or Gemini
(`gemini -p … --approval-mode yolo`) — with `cwd` = the scoped clone.

Resiliency chain (design intent):
1. **Primary** — the ticket's `authorized_model`.
2. **Cloud fallback** — a pre-approved comparable model on another provider.
3. **Ultimate fallback** — air-gapped local LLM via Ollama. Tiers: 8–16GB → Llama 3.1 8B /
   Qwen 2.5 Coder 7B; 24–64GB → Qwen 2.5 Coder 32B / DeepSeek Coder V2 Lite 16B.

Portable context means any model resumes the task. Detail in
[`[TDD] Worker Lifecycle & Fallback Matrix (Latest Truth).md`](./[TDD]%20Worker%20Lifecycle%20&%20Fallback%20Matrix%20(Latest%20Truth).md).

## 5. Review & merge
Review/merge is **per branch**, not per ticket. A branch review group is every ticket on
`ticket/<owner>` (Task + its test tickets). A single **Approve & Merge** is offered once the
branch is *fulfilled* (all members In Review); it merges the branch `--no-ff` into the
Repository default branch and sets **all** members to `Done`. Merge/approval happens **only**
when a human clicks it — the orchestrator never self-approves.

## 6. Document side-effects
For documentation deliverables, the orchestrator grants write scope to the relevant
`DocsAssets/` path and validates the diff against the Agent Contribution Protocol.
