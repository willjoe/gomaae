---
title: Document Governance Policy
type: specification
domain: Global
status: latest-truth
owner_role: business-architect
last_reviewed: 2026-06-04
related:
  - ./Agent Contribution Protocol.md
  - ./Evidence & Retention Lifecycle.md
---

# Document Governance Policy

How documentation under `DocsAssets/` is owned, organized, and kept as **Latest Truth**.
Applies equally to human engineers and AI Agents — agents are first-class authors bound
by the same rules.

## 1. Principles

1. **Living Specification ("Latest Truth").** Specs are not historical artifacts. They are
   overwritten in place to stay in perfect sync with the source code. There is **no
   document graveyard** — git history is the audit trail, not a folder of dead specs.
2. **Object-Oriented / Domain-Driven layout.** Everything is organized around permanent
   **domain nouns** (e.g. `Agent_Orchestration`), never around projects, epics, or verbs.
   A domain outlives any project.
3. **Single source of truth.** A fact lives in exactly one document; cross-link by path.
4. **Least-privilege authorship.** An agent writes only to the paths its active ticket
   scopes. Out-of-scope writes are a hard failure.
5. **Assetized evidence.** Test evidences are permanent technical assets encapsulated in
   each feature's `Evidences/` vault — see [`Evidence & Retention Lifecycle.md`](./Evidence%20&%20Retention%20Lifecycle.md).

## 2. The two-category root (and why)

`DocsAssets/` contains exactly two content categories so it sorts naturally A–Z:

- **`Global/`** — product-wide strategy and shared information (Briefs, Guardrails,
  Presentations, Architecture_Design, Design_System, Governance, Templates).
- **`Domains/`** — the core object-oriented domain layer; one folder per capability noun.

## 3. Rejected patterns (do NOT reintroduce)

- ❌ **Epic-number / project-name folders** (`[Epic-101] Monolith_Decoupling`). Files get
  abandoned when the project closes. Organize by domain noun instead.
- ❌ **Numbered prefixes** (`01_Global`, `02_Domains`). They force rename churn on
  insertion. Rely on native A–Z sorting and tooling search.
- ❌ **Ultra-bold impression fonts** (e.g. Impact) for prose. Use `Inter (Black 900)` with
  tightened letter-spacing; hierarchy comes from weight + whitespace
  (see Design_System).

> The legacy numbered specs at the repository root (`01-…99-….md`) predate this policy.
> They are retained as **migration sources only** and are not Latest Truth.

## 4. Ownership

Each document declares `owner_role` (a slug from `agent-roles/roles/`). The owning role is
accountable for accuracy. Mapping: architecture → `cloud-architect`/`business-architect`;
security → `security-engineer`/`identity-engineer`; product/briefs → `core-pm`/`ai-pm`;
runbooks → `devops-engineer`/`delivery-manager`; data → `data-architect`.

## 5. Validation (CI + orchestrator pre-accept)

- Front-matter present and schema-valid (see Agent Contribution Protocol).
- No numbered prefixes; no project/epic folders.
- All `related:` paths and intra-repo links resolve.
- No file modified outside the committing ticket's authorized paths.
- Evidence filenames match the `img_`/`vid_` grammar.
