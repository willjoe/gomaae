# ticket-workspace

Experimentation harness for **ticket-linked agents**, built to the High-Integrity
standardized hierarchy under `~/Agentic`. Lets us iterate on the per-ticket
execution model in plain Node — no Docker/Tauri yet — before grafting it into
`agent-orchestrator-hq`.

## Standardized hierarchy

```
~/Agentic/<project>/
  Repository/   canonical source of truth (git)
  DocsAssets/  Tickets/  Logs/  Config/
  Workspaces/                 ephemeral, per-ticket
    <TICKET>/
      repo/          scoped clone (sparse-checked-out to allowed_paths)
      manifest.json  automated-management metadata
      agent.log      run transcript
```

## The two boundaries

- **Presentation** — `repo/` is sparse-checked-out to the ticket's `allowed_paths`,
  so the agent cannot even *see* out-of-scope files.
- **Enforcement** — before commit, the full diff is re-checked against
  `allowed_paths`; any out-of-scope change is rejected. The agent commits onto
  `ticket/<id>`; the canonical `Repository` is never written to.

## Usage

```bash
node run.js init-lab                # provision ~/Agentic/ticket-lab (demo repo + tickets)
node run.js run LAB-1               # materialize -> mock agent -> gate (PASS, commits)
node run.js run LAB-1 --rogue       # agent also edits out-of-scope -> gate REJECT
node run.js status                  # show workspace manifests
node run.js clean                   # tear down ephemeral workspaces

# target a different project: --project <slug>
```

Tickets live in `Tickets/tickets.json` as `{ id, title, role, allowed_paths }`.

## Roadmap (little by little)

1. ✅ Materialize scoped worktree + diff-scope gate, mock agent (this harness).
2. Real agent call (Claude/Ollama) in place of the mock editor.
3. Run inside a per-ticket Docker container (mount `repo/` at `/app/workspace`).
4. Add `allowed_paths` to the ticket schema; drive scope from the DB.
5. Wire into `agent-orchestrator-hq` (`lib/workspace.ts` + Rust `#[tauri::command]`).
