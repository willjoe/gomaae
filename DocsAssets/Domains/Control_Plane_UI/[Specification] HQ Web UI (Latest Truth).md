---
title: HQ Web UI
type: specification
domain: Control_Plane_UI
status: latest-truth
owner_role: frontend-web-eng
last_reviewed: 2026-06-08
related:
  - ../../Global/Briefs/Control_Plane_UI.md
  - ../../Global/Guardrails/Control_Plane_UI_Guardrails.md
  - ../../Global/Design_System/[Specification] Design Tokens & Typography (Latest Truth).md
  - ./[Runbook] HQ Deployment.md
---

# HQ Web UI (Latest Truth)

The control-plane UI humans use to monitor, assign, and validate AI-driven work.
Implemented in `agent-orchestrator-hq` (Next.js App Router, React 19, Tailwind v4, Tauri).

> This Next.js build carries breaking changes from upstream — consult
> `agent-orchestrator-hq/node_modules/next/dist/docs/` before writing UI code (per repo `AGENTS.md`).

## 1. Lifecycle phases & theming
Five lifecycle phases, each with one accent color:
**Initiative** (Epic, amber) → **Planning** (Story, blue) → **Development** (Task/UnitTest,
violet) → **Testing & Review** (QA, red) → **Operation** (Triage, emerald). The sidebar
hover/active states and each phase page carry that phase's color. Tier badges:
Epic amber, Story/Task blue, **QA pink**, **UnitTest fuchsia** (distinct but same warm
family), Triage orange.

## 2. Screens
- **Initiative / Planning / Development / Testing & Review / Operation** — per-phase boards
  (Gantt + ticket lists), scoped to that tier. Each **+ New** button opens a ticket-creation
  modal whose Assigned-Role dropdown is filtered to that lifecycle's roles (sourced from the
  Agent Roles registry, with "+ Add role" linking to the Agent Roles page).
- **Ticket Detail** — description, dependencies, branch commits, and the run controls
  (Start → In Queue; Approve & Merge only on the branch owner).
- **Agent Assignments** — the worker registry grouped by status. **In Queue** is an
  `agent_state` section (not a status). The **Agent Containers** panel shows each active
  container's live `agent_phase` via a 5-step indicator (Building Container · Now Coding ·
  Finalizing · Committing · In Review / Stopped). The **In Review** stage renders one
  **Branch Review Card** per branch (Task + its test tickets combined) with a single
  **Approve & Merge**.
- **Test & Review** — verification queue listing **QA and UnitTest** tickets (color-coded).
- **Agent Roles & Organization** — sideways org chart (root → departments → roles); each role
  labeled and colored by its single lifecycle.
- **AI Engine** — providers (Anthropic / **Gemini** / local), model list served from a DB
  cache with explicit refresh.
- **Documents** — renders `DocsAssets/` alongside originating tickets.

## 3. Theme / dark mode
Appearance (`light`/`dark`/`system`) is stored in the global `config.yaml`. The app uses
**class-based** dark mode (`.dark`/`.light` on `<html>` via `@custom-variant dark`), and
`system` follows the OS live through a `matchMedia('change')` listener.

## 4. Backend
Next.js App Router serves UI + route handlers; per-workstation SQLite for ticket state
(global `config.yaml` for core config); Markdown via `react-markdown` + `remark-gfm`. Agent
runs, commits, and merges are executed by real route handlers (`/api/tickets/run`,
`/api/tickets/commits`, `/api/tickets/merge`) against real git — no mocked workflow.

## 5. Deployment
See [`[Runbook] HQ Deployment.md`](./[Runbook]%20HQ%20Deployment.md). E2E under
`agent-orchestrator-hq/e2e/` (Playwright); stories in `.storybook/`.
