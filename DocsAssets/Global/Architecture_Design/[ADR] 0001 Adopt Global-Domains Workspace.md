---
title: Adopt Global/Domains DDD Workspace
type: adr
domain: Global
status: latest-truth
owner_role: business-architect
last_reviewed: 2026-06-04
related:
  - ../Governance/Document Governance Policy.md
---

# [ADR] 0001 — Adopt the Global/Domains DDD Workspace

## Status
Accepted.

## Context
Documentation began as flat numbered files at the repo root (`01-…99-…`). As AI Agents
become first-class authors that place and manage documentation, we need a layout that is
domain-permanent, project-agnostic, and friendly to least-privilege write scopes — plus a
"Latest Truth" discipline so docs never rot into a graveyard.

## Decision
Adopt a two-category workspace inside `DocsAssets/`: **`Global/`** (product-wide strategy
and shared info) and **`Domains/`** (object-oriented capability nouns). Documents are
tagged by type (`[Specification]`, `[TDD]`, `[QA]`, `[Runbook]`, …), carry YAML
front-matter, and link by relative path. Test evidences are assetized inside each feature's
`Evidences/` vault under a fixed media-naming grammar and retention lifecycle.

Rejected: epic/project folders, numbered prefixes, and impression fonts for prose.

## Consequences
- The orchestrator grants write scope to a domain/feature path without exposing source code.
- Specs stay in sync with code (overwritten in place); history lives in git + evidences.
- The legacy root `01-…99-…` files become migration sources, not Latest Truth, and are
  folded into `Global/` and `Domains/` over time.
