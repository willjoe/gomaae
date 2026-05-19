# High-Integrity Migration Framework

This document outlines the systematic process for migrating an existing project (like GalaSpo) from a traditional development model to the **High-Integrity Atomic Development**.

---

## 1. Migration Lifecycle (The 4-Phase Transition)

To minimize operational disruption, migrations follow a "Shadow-to-Strict" progression.

### Phase 1: The Integrity Audit
*   **Inventory:** Map all existing repositories, secrets, and third-party integrations.
*   **Role Mapping:** Assign every human and AI identity to one of the predefined High-Integrity roles (e.g., `API Engineer`, `Security Engineer`).
*   **Constraint Baseline:** Run a "Dry Run" audit to see how many existing workflows would be blocked by current High-Integrity rules (e.g., identifying cross-repository imports or unversioned APIs).

### Phase 2: Structural Scaffolding & Policy Rollout
*   **Credential Cleanup:** Move all hardcoded or `.env` secrets into a centralized Manager (GCP Secret Manager) with JIT access.
*   **Policy Migration (Pre-Commit & PR):** Fully migrate and activate the universal pre-commit hooks (linting, local build validation) and PR CI/CD policies (branch counting, mandatory reviews). This provides immediate value and structure while engineers are still operating entirely in **Direct Execution** mode (working locally without the JIT sandbox).
*   **GitOps & CI/CD Pipeline Migration:** Fully automate build, test, and deployment processes into Git-triggered CI/CD pipelines. This ensures that all releases are driven exclusively by code merges (rather than manual clicks or local scripts), acclimating the team to strict GitOps delivery while they continue to code locally.
*   **Hierarchical Dependency Refactoring:** Identify all existing direct dependencies between sibling repositories. These must be refactored into **Environment-Variable-Based** configurations managed and injected by the parent repository (`infra`). Direct imports or service linking across non-parent repos are strictly prohibited.
*   **Test Standardization:** Refactor existing test suites to support the **Unified Actor Pattern** (Playwright + Appium) to enable headless validation.
*   **Documentation Externalization:** Migrate PRDs and architectural docs from the repository to external managers (Notion/Linear) to satisfy the "Executable-Only" repository mandate.

### Phase 3: Shadow Execution (Reporting Mode)
*   **Orchestrator Injection:** Start using the Master Orchestrator to provision environments, but do not enforce `Deny-by-Default` yet.
*   **Telemetry Collection:** Log all instances where an engineer or AI attempts to access a file outside their "theoretical" ticket scope.
*   **Visual Evidence Trial:** Begin generating Storybook/E2E video evidence for PRs, but allow merges even if evidence is missing.

### Phase 4: Strict Enforcement (High-Integrity Atomic Development Active)
*   **VFS/Container Hardening:** Enable absolute file system and network isolation for all tasks.
*   **Cryptographic Gating:** Activate pre-receive hooks that reject any commit not signed by JIT credentials or exceeding the ticket's mutation scope.
*   **Human-in-the-Loop Finalization:** Human architects must now approve all transitions from "Shadow" to "Strict" for each repository.

---

## 2. Migration Tooling Requirements

To support this workflow, the following utilities must be provisioned:
1.  **The "Scoper" Utility:** An AI tool that analyzes a ticket description and suggests the minimal `allow_read` and `allow_write` file paths.
2.  **Secret Sweeper:** A pre-migration script that identifies and flags any secrets currently residing in the codebase.
3.  **Identity Bridge:** A service that maps local OS identities (`whoami`) to the High-Integrity JIT system during the transition.

---

## 3. GalaSpo Specific Migration Path

For GalaSpo, the migration will prioritize the services in this order:
1.  **`gate` (IAM Security Proxy):** Must be migrated first to secure the perimeter.
2.  **`central` & `api`:** Core logic and data access.
3.  **`rec` (Mobile):** Requires the newly defined hardware simulation suite.
4.  **`infra`:** Final transition to multi-signature IaC.
