---
title: External Sync
type: specification
domain: Connectors_&_Integration
status: latest-truth
owner_role: integration-engineer
last_reviewed: 2026-06-08
related:
  - ../../Global/Briefs/Connectors_&_Integration.md
  - ../../Global/Guardrails/Connectors_&_Integration_Guardrails.md
  - ../Ticketing/[Specification] Ticket Model & Lifecycle (Latest Truth).md
---

# External Sync (Latest Truth)

Import and synchronize work between external trackers and the local SQLite source of truth.
Implemented under `connectors/`; legacy detail: root `21-ticket-manager-sync-instructions.md`.

## 1. Supported systems
Jira, Linear, Asana (and GitHub) — import existing code/tickets, or start fresh with no
external dependency.

## 2. Field mapping
External issues map to the Ticket model (Shared Data Model). Mapping is explicit per
connector; unmapped external fields are preserved as metadata, not promoted to truth. Only
the **standard `status`** is synced as a first-class field — orchestration sub-states
(`agent_state`/`agent_phase`) are local-only and never pushed.

### Hierarchy mapping
The binding external constraint is Jira (one terminal sub-task level), not Linear (arbitrary
sub-issue nesting). To stay portable, the HQ keeps a native **3-level spine**
Epic → Story → Task and represents deeper or cross-cutting tickets (`UnitTest`, `QA`,
sub-tasks) as **typed linked issues** rather than extra nesting. So a `QA` ticket is a
**child** of its Story internally (`parent_id`) but is published externally as a linked
"Test" issue. Connectors rebuild the internal tree from the external links on inbound sync.

## 3. Sync semantics
- **Inbound:** import + ongoing pull of status, comments, attachments.
- **Outbound:** push status transitions, PR links, and agent comments.
- **Conflict rule:** SQLite wins unless a documented reconciliation rule says otherwise.

## 4. Credentials
External API credentials are issued and stored only via Identity_&_Security; never inline.

## 5. Reliability
Respect provider rate limits with backoff; target sync lag < 30s.
