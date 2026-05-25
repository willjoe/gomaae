# AI Orchestration & Master Infrastructure

The **Master Orchestrator** is the centralized automated authority that governs the lifecycle of AI Agents and ephemeral development environments. In a High-Integrity architecture, the Orchestrator is the only entity permitted to generate credentials and provision resources based on ticket metadata.

---

## 1. Orchestrator Identity & Security
To prevent the Orchestrator from becoming a single point of compromise, it is governed by the following rules:
*   **Service Identity:** The Orchestrator runs under a unique, high-privilege Service Account (`master-orchestrator@project.iam.gserviceaccount.com`).
*   **Network Isolation:** The Orchestrator is reachable *only* via authenticated webhooks from the Project Management System (e.g., Jira/Linear) and the Security Audit Vault.
*   **No Human Access:** Human engineers (including DevOps) are strictly prohibited from possessing the keys to the Orchestrator's service account. Any configuration changes to the Orchestrator itself must be handled via a multi-signature IaC Pull Request.

---

## 2. Just-In-Time (JIT) Credentialing (Repository Focus)
The Orchestrator eliminates standing privileges by generating ephemeral credentials on-demand, focused primarily on Version Control access.

1.  **Zero Cloud Mutation:** Most engineers (Human or AI) are never granted write or delete access to live cloud environments. They operate strictly within local/sandbox testing environments.
2.  **Branch-Scoped Access:** Upon ticket activation, the Orchestrator generates short-lived JIT credentials (e.g., GitHub Installation Tokens) that grant access **strictly and exclusively** to the specific repository and the assigned branch defined in the ticket.
3.  **Automated Cloud Validation:** All cloud-based integration tests and deployments occur **after the Pull Request is merged**, executed automatically by the CI/CD pipeline using higher-privilege system accounts. This ensures that the individual user's credentials never touch the production or staging cloud infrastructure.

---

## 3. Repository Isolation (Simplified Provisioning)
Instead of a complex Virtual File System (VFS) for monorepo projection, the architecture relies on **Multi-Repository Isolation**.

*   **Domain Segregation:** Frontend, Backend, ML, and Infrastructure codebases are housed in completely separate Git repositories.
*   **Role-Based Repository Mapping:** The Orchestrator provides the user with credentials *only* for the repositories authorized by their role (e.g., a Frontend Web Engineer receives a token for the `frontend-web` repo, but cannot even list the `backend-api` repo).
*   **Ephemeral Sandboxes:** Development environments (containers) are spun up with the required local dependencies. The Orchestrator injects the specific repository token into the environment memory at runtime, allowing the user to clone and modify their assigned branch.
*   **Memory-Only Secrets:** Any required secrets (for local testing only) are injected directly into the process memory of the sandbox container. No secrets are ever stored on the sandbox's virtual disk.

---

## 4. Branch & Chain of Custody Management
The Orchestrator manages the Git lifecycle to ensure code integrity.

*   **Managed Branches:** The Orchestrator creates and names all task branches. Engineers and AI agents cannot create their own branches in the central repository.
*   **Signed Commits:** The Orchestrator provisions an ephemeral GPG key to the sandbox. Every commit must be cryptographically signed to be accepted by the Git server.
*   **Audit Trail:** Every Git action (clone, commit, push) is linked back to the Atomic Task ID in the immutable audit logs, creating a mathematical "Agentic Engineering" from the Architect's initial ticket to the final line of code.

---

## 5. Ephemeral Container Sandboxes & Key Management
To prevent AIs from accidentally committing out-of-scope tasks and to securely manage their credentials, the architecture abandons native OS-level users in favor of **Ephemeral Containers (Docker/Podman)**. These containers provide absolute file system isolation and perfectly scoped Git attribution.

The architecture supports a **Dual-Container Execution Strategy**:

1.  **The CLI Login Container (Migration/PoC Phase):** 
    *   Designed for early project stages or local migration phases.
    *   This container runs locally on the developer's machine and relies on the developer's own SSO/CLI login (e.g., `gcloud auth login`) mapped into the container to generate session tokens. 
    *   It will remain permanently available as an option for local, human-supervised debugging of AI agents.
2.  **The API Key Container (Final Cloud Form):** 
    *   The production-grade execution environment. These containers run completely headless in a closed, High-Integrity cloud environment.
    *   Instead of CLI logins, centralized, securely assigned LLM API keys (e.g., from GCP Secret Manager) are dynamically injected directly into the container's in-memory environment variables at runtime. The keys are never written to disk or exposed to human developers.

### Sandbox Isolation & Git Attribution
Regardless of the container type, all AI sandboxes enforce the following:
*   **Absolute File Isolation (Bind Mounts):** The orchestrator provisions the container by mounting *only* the specific local repository directory required for the current ticket. The AI physically cannot access or modify any other repository on the host machine.
*   **On-the-Fly Destruction:** Once the Pull Request is opened, the container is immediately destroyed (`--rm`). There are no lingering keys, cached data, or persistent user permissions left behind.
*   **Dynamic Git Attribution:** To avoid managing millions of distinct AI user accounts, AIs will commit using a shared system Git account but will use the `GIT_AUTHOR_NAME` and `GIT_COMMITTER_NAME` environment variables, injected dynamically at container startup, to attribute the exact AI agent's name and role to the commit metadata.

---

## 7. Repository Hierarchy & Dependency Management

In the Agentic Engineering, cross-repository dependencies are strictly governed to prevent "Dependency Sprawl" and unauthorized lateral movement.

### The Parent-Child Rule
*   **Direct Dependencies:** Cross-repository code or infrastructure dependencies are only permitted if a strict **Parent-Child Relationship** is defined in the deployment manifest.
*   **Infrastructure as the Root:** The `infra` repository is the universal parent for all functional repositories (`api`, `central`, `rec`, etc.). It contains the global state and deployment logic.

### Environment-Based Dependencies (Non-Parent Relations)
If a dependency exists between two repositories that are not in a direct parent-child relationship (e.g., `api` calling `central`), the connection must be managed via **Environment Variables** injected from the parent repository (`infra`).
*   **No Direct Linking:** Children repositories are prohibited from reaching into or importing code directly from "sibling" repositories.
*   **Injected Configuration:** All service discovery (URLs, API keys, endpoints) must be passed down from the `infra` layer as environment variables during the JIT provisioning phase. This ensures that a compromise of the `api` service does not grant the attacker knowledge or access to the `central` repository's internal structure or source code.
