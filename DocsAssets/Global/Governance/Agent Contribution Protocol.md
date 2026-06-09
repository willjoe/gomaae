---
title: Agent Contribution Protocol
type: specification
domain: Global
status: latest-truth
owner_role: ai-pm
last_reviewed: 2026-06-04
related:
  - ./Document Governance Policy.md
  - ./Evidence & Retention Lifecycle.md
---

# Agent Contribution Protocol

The operational contract an AI Agent (or human) follows when placing or editing a document
in `DocsAssets/`. The orchestrator enforces it.

## 1. Front-matter schema

Every Markdown document begins with YAML front-matter:

| Field | Required | Description |
|-------|----------|-------------|
| `title` | yes | Human-readable title (matches the part after the `[Type]` tag in the filename). |
| `type` | yes | `specification`, `tdd`, `qa`, `brief`, `guardrails`, `adr`, `runbook`, `design`, `template`. |
| `domain` | yes | Domain noun (e.g. `Agent_Orchestration`) or `Global`. |
| `status` | yes | `latest-truth` for live specs; `superseded` only for retired *domains*. |
| `owner_role` | yes | Accountable role slug from `agent-roles/roles/`. |
| `last_reviewed` | yes | ISO date `YYYY-MM-DD`; bump on every substantive edit. |
| `related` | no | List of **relative paths** to related documents (direct links, not ids). |

We use **direct relative-path links**, not numeric ids — consistent with the ticket
hand-off rule below and the rejection of numbered schemes.

## 2. File naming inside a domain

Documents carry a bracketed **type tag** prefix and live directly in their domain folder
(domain folders and feature folders use `Title_Case_With_Underscores` and `&`):

```
Domains/Billing_&_Payment/
├── [Specification] Billing Plan Requirements (Latest Truth).md
├── [TDD] Stripe Integration Specs (Latest Truth).md
└── Features/
    └── Credit_Card_Payment/
        ├── [TDD] Card Validation & Processing.md
        ├── [QA] Payment Test Cases.md
        └── Evidences/
            └── 202606_Initial_Release/
```

Tags sort and group naturally A–Z; **never** prefix with numbers.

## 3. Workflow

1. **Receive scope.** Ticket grants write access to a path (e.g. a domain or feature
   folder). Do not write elsewhere.
2. **Pick the template** from `Global/Templates/` for the document type.
3. **Author.** Fill front-matter; write GFM body; link related docs by relative path;
   reference media from the feature's `Evidences/` vault.
4. **Self-validate** (schema, naming, resolving links, evidence grammar).
5. **Commit** atomically, message prefixed with the ticket id; signed under the agent's
   ephemeral identity.

## 4. Hard failures (diff rejected)

- Writing outside authorized paths.
- Missing/invalid front-matter, or a numbered prefix, or an epic/project folder.
- Broken `related:` paths or dead links.
- Evidence filenames that violate the `img_`/`vid_` grammar.

## 5. Ticket hand-off rule (Zero-Question delegation)

Generated Epic tickets MUST embed **direct links to exact live files**, never generic
folders:

- **Background (Why/What):** URL to `Global/Briefs/<Domain>.md`
- **Guardrails (Boundaries & Metrics):** URL to `Global/Guardrails/<Domain>_Guardrails.md`

These two documents are the execution team's complete source of truth, letting PMs,
engineers, and agents self-direct and cut their own stories within a safe sandbox.
