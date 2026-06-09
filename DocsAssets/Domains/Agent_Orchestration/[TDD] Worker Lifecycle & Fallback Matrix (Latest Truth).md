---
title: Worker Lifecycle & Fallback Matrix
type: tdd
domain: Agent_Orchestration
status: latest-truth
owner_role: devops-engineer
last_reviewed: 2026-06-08
related:
  - ./[Specification] Orchestration Requirements (Latest Truth).md
  - ./Features/Model_Fallback_Chain/[TDD] Ollama Local Fallback.md
---

# [TDD] Worker Lifecycle & Fallback Matrix (Latest Truth)

## 1. Design summary
The queue-drain maps ticket transitions to real run actions and drives model selection.
Durable state lives in SQLite (`agent_state`, `agent_phase`) and on disk (the scoped clone +
its `ticket/<owner>` branch), so a worker run is disposable and resumable.

## 2. Components & data flow
```
Start → agent_state=Queued
queue-drain (unblocked + tier gate ok)
  → run route: resolve branch owner → prepareTicketWorkspace (scoped clone, branch)
  → runCodingAgent(model CLI, cwd=repo)        [agent_phase: Coding]
  → stage + commit real diff                   [agent_phase: Finalizing→Committing]
  → push --force origin ticket/<owner>         → status=In Review, agent_state=Stopped
Approve & Merge (human) → merge branch group → all members Done
```
Branch owner: a Task owns its branch; a test ticket resolves to its target Task's branch
(`linked_ticket_id`), so test commits land on the Task branch.

## 3. Fallback selection
```
try primary model (ticket.authorized_model)
  └─ on unreachable/ratelimit → next approved provider (≤ 2 hops)
       └─ on all-cloud-fail / partition → local Ollama endpoint
```
Selection is logged for chain-of-custody; the chosen agent/model is recorded on the run
result.

## 4. Edge cases & failure modes
- **UnitTest started too early** → run route re-queues it (status To Do, `agent_state=Queued`)
  until its target Task is In Review.
- **No coding agent available** → run aborts, `agent_state` cleared, error surfaced (activate
  a Claude/Gemini CLI on the AI Engine page).
- **Branch not fulfilled** → merge route refuses (409) until every group member is In Review.
- Provider 429 vs. hard outage → backoff then hop; local tier too small → tier-appropriate
  local model; mid-task fallback rehydrates from the branch (no work lost).

## 5. Test strategy
Verified by `Features/Model_Fallback_Chain/[QA] Fallback Test Cases.md`; evidences captured
per release in that feature's `Evidences/` vault.
