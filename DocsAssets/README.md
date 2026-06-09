# DocsAssets

The **governed, Domain-Driven documentation & evidence workspace** for the High-Integrity
Atomic Development (HIAD) / Agentic Engineering platform. This is the dedicated location
where AI Agents and human engineers **place and manage living documentation and test
evidences**.

## Design philosophy

- **Living Specification ("Latest Truth").** Specs are overwritten in place to stay in sync
  with the source code — never a graveyard of closed projects. Git history is the audit
  trail.
- **Object-Oriented / Domain-Driven layout.** Everything is organized around permanent
  **domain nouns**, never projects, epics, or verbs.
- **Zero-Question delegation.** Each domain ships a **Brief** (Why/What) + **Guardrails**
  (boundaries) so tickets can fully delegate work without back-and-forth.
- **Assetized evidence.** Test screenshots/recordings are permanent assets encapsulated in
  each feature's `Evidences/` vault.

See `Global/Governance/` for the full policy, contribution protocol, and evidence lifecycle.

## The two-category root (sorts naturally A–Z)

```
DocsAssets/
├── Global/                 Product-wide strategy & shared information
│   ├── Briefs/             Why/What summary, one per domain  ← tickets link here
│   ├── Guardrails/         Boundaries & metric constraints   ← tickets link here
│   ├── Presentations/      Pitch decks built from Briefs/Guardrails
│   ├── Architecture_Design/ System architecture, ADRs, shared data model
│   ├── Design_System/      Design tokens & typography (Inter Black 900)
│   ├── Governance/         How docs/evidences are governed (read first)
│   ├── Templates/          Skeletons agents copy by [Type]
│   ├── Product_Overview.md
│   └── User_Personas.md
│
└── Domains/                The object-oriented domain layer (capability nouns)
    ├── Agent_Orchestration/        ← worked example incl. a Features/ capsule + Evidences
    ├── Ticketing/
    ├── Identity_&_Security/
    ├── Agent_Roles/
    ├── Control_Plane_UI/
    ├── Connectors_&_Integration/
    └── Knowledge_&_Context/
```

Each domain holds its `[Specification]` / `[TDD]` Latest-Truth docs at the top level and a
`Features/` folder of capsules; each feature has `[TDD]`, `[QA]`, and an `Evidences/` vault.

## Conventions (enforced)

- **No numbered prefixes**, **no epic/project folders** — rely on A–Z sorting + search.
- Documents carry a bracketed **type tag** (`[Specification]`, `[TDD]`, `[QA]`, `[Runbook]`,
  `[ADR]`, `[Template]`) and YAML front-matter; links are **relative paths**.
- Evidence media: `[img|vid]_<test_case_id>_<status>_<YYYYMMDD>.<ext>`.

## Note on the legacy root specs

The numbered `01-…99-….md` files at the repository root predate this workspace. They remain
in place (experimental) as **migration sources** and are folded into `Global/` and
`Domains/` over time; they are not Latest Truth.
