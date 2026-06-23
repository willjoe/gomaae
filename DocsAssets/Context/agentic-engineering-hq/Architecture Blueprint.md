# Architecture Blueprint

## System Overview
The Agentic Engineering HQ orchestrates autonomous AI workers against high-integrity ticket nodes.

## Core Components
- **Control Plane**: Next.js dashboard for agent assignment and governance.
- **Worker Plane**: Sandboxed Docker containers running LLM inference.
- **Persistence**: SQLite (better-sqlite3) with vector search capabilities.
