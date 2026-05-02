# Migration & Missing Features Backlog (99)

This document tracks the technical gaps and "Missing Features" identified during the planning for the Zero-Trust migration of existing projects (like GalaSpo). 

---

### 1. The "Scoper" Enforcement Gate [DONE]
*   **Feature:** Automated PR-review script (`scoper-enforcer.js`) that diffs the Pull Request against the ticket's `allow_write` metadata.
*   **Status:** Implementation complete in `scripts/scoper-enforcer.js` and integrated into GitHub Action `scoper-gate.yml`.

### 2. Hierarchical Dependency Refactoring [DONE]
*   **Feature:** Policy requiring cross-repo dependencies to be managed via environment variables injected by the parent (`infra`).
*   **Status:** Codified in architectural documents `18` and `20`.

### 3. Synthetic Reality Testing (SRT) Pipeline [SCAFFOLDED]
*   **The Problem:** We need to generate exhaustive test cases for GalaSpo's soccer player detection using deterministic, synchronized sensor and video data.
*   **Status:** Initial scaffolding and sample **Omniverse Replicator** script created in `srt-generator/`.
*   **Task:** Finalize the **OpenUSD** scene for the "Soccer Match" and integrate the generator into the CI/CD pipeline.

### 4. Zero-Trust Identity Bridge (`zt-cli`) [SCAFFOLDED]
*   **The Problem:** Human developers need a way to bridge their local machines (macOS) or local containers to the JIT Zero-Trust system, while respecting the correct lifecycle trigger: **Backlog -> ToDo**.
*   **Status:** Initial prototype implemented in `zt-cli/`. Supports `start` and `status` commands with trigger detection and **AI Opt-In** enforcement.
*   **Task:** Implement the actual VFS mounting logic (using FUSE or bind-mounts) and integrate with the real Linear/Jira API.

### 5. Automated Documentation "Sweeper" [DONE]
*   **Feature:** Script (`doc-sweeper.js`) to identify, categorize (via AI), and migrate legacy docs to Notion/Linear.
*   **Status:** Script implemented and verified in `scripts/doc-sweeper.js`.
