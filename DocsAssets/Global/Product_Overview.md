---
title: Product Overview
type: brief
domain: Global
status: latest-truth
owner_role: core-pm
last_reviewed: 2026-06-04
related:
  - ./User_Personas.md
  - ./Architecture_Design/[Specification] System Architecture (Latest Truth).md
---

# Product Overview — Agentic Engineering HQ

A centralized platform to manage autonomous AI software engineers (Agents) for any
software project: a Dockerized system with a Web UI for monitoring, assigning, and
validating AI-driven development tasks across local and remote environments.

## Core workflows
- **Project initiation & state** — universal import (Linear/Jira/GitHub) or fresh start;
  SQLite as local source of truth; phase-based lifecycle.
- **Git lifecycle** — dynamic branching on *In Progress*; mounted repos; atomic
  ticket-prefixed commits; auto PRs on completion.
- **Agent execution** — one Docker worker per task; Claude & Gemini with secure credential
  injection; stop on *In Review*, reactivate on feedback, decommission on *Done*.

## Domains
Capability areas live under `Domains/`: Agent_Orchestration, Ticketing,
Identity_&_Security, Agent_Roles, Control_Plane_UI, Connectors_&_Integration,
Knowledge_&_Context. Each carries its own Latest-Truth specs and feature capsules.

## Documentation model
Per-domain **Briefs** (Why/What) + **Guardrails** (boundaries) package every initiative
for Zero-Question delegation; tickets link directly to those two files.
