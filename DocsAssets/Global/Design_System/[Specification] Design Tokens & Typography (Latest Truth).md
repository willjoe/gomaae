---
title: Design Tokens & Typography
type: design
domain: Global
status: latest-truth
owner_role: frontend-web-eng
last_reviewed: 2026-06-04
related:
  - ../../Domains/Control_Plane_UI/[Specification] HQ Web UI (Latest Truth).md
---

# Design Tokens & Typography (Latest Truth)

Global design tokens and UI conventions for the HQ control plane and all generated
presentations.

## Typography
- **Primary family:** `Inter`.
- **Emphasis / summary headings:** `Inter (Black 900)` with slightly tightened
  letter-spacing (≈ `-0.02em`). Hierarchy comes from the balance of weight and whitespace.
- ❌ **Do not** use ultra-bold impression/compressed fonts (e.g. Impact) for multi-line
  prose — they degrade readability and the clean UI aesthetic.

## Token categories
- **Color:** semantic tokens (surface, text, accent, success, warning, danger) — define
  here, never hardcode hex in components.
- **Spacing:** 4px base scale.
- **Radius / elevation:** shared corner and shadow tokens.
- **Type scale:** display / heading / body / caption mapped to Inter weights.

## Components
Global UI component definitions (buttons, cards, log viewer, status chips) live here and
are consumed by `Control_Plane_UI`. Storybook stories under
`agent-orchestrator-hq/.storybook/` are the rendered reference.
