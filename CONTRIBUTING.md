# Contributing

## Prerequisites

- Node 20.18.x (`nvm use` or `fnm use`)
- Rust stable (`rustup update stable`)
- Tauri CLI v2 (`cargo install tauri-cli --version "^2"`)

## Local development

```bash
npm install
npm run dev          # Next.js on :4000 with Turbopack (fast HMR)
npx tauri dev        # Tauri shell — points to :4000 in dev
```

> **Note:** For Playwright e2e tests use `next dev --webpack` — Turbopack's cold-start
> can block 45+ minutes before serving the first byte in that context.

## Branches

| Branch | Purpose |
|--------|---------|
| `main` | Stable; every push here is releasable |
| `feat/*` | Feature work — PR into `main` |

## Releasing

1. Bump `version` in `src-tauri/tauri.conf.json`
2. Commit: `chore(release): bump version to X.Y.Z`
3. Push to `main`
4. `git tag vX.Y.Z && git push origin vX.Y.Z`
5. CI builds macOS (universal), Windows (x64), and Linux (x64), then creates a draft GitHub Release
6. Review the draft in GitHub Releases and publish

## Database migrations

All schema changes go in `src/lib/db.ts` using `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` guards.
Never drop or rename columns that may hold user data; mark them deprecated instead.

## AI integration

Claude model calls go through `src/lib/ai/llm.ts` (`generateText`).
Default model is `claude-opus-4-8`. Do not hardcode model IDs elsewhere.

## Code style

- TypeScript strict mode; no `any` outside of explicit escape hatches
- Rust: `cargo fmt` and `cargo clippy` before committing
- No comments explaining *what* the code does — only *why* when the reason is non-obvious
