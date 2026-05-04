# Strict Task Assignment & Execution Isolation

To achieve a true High-Integrity Atomic Development, the mechanism by which tasks are assigned and executed must be rigidly controlled. This document outlines the technical boundaries enforced during the engineering lifecycle.

## 1. The Atomic Ticket

In this architecture, the Jira ticket (or equivalent) is not just a description of work; it is a **cryptographic access token and environment configuration manifest**.

An Atomic Ticket must contain:
*   **Clear Text Description:** What needs to be done.
*   **Resource Scope:** Explicit URIs or file paths that the assignee is allowed to read.
*   **Mutation Scope:** Explicit URIs or file paths that the assignee is allowed to modify.
*   **Time-to-Live (TTL):** A hard deadline after which the task's associated access is automatically revoked.

## 2. Sandboxed Development Workspaces

Local development introduces unacceptable risk (data exfiltration, unrestricted lateral movement). All development must occur in system-provisioned Sandboxed Workspaces.

*   **Virtual File Systems (VFS):** The workspace uses a VFS. If a task only requires modifying a specific microservice, the VFS will project *only* that microservice's directory. The rest of the monorepo will appear to not exist.
*   **Network Egress Control:** The workspace has no general internet access. It can only communicate with authorized internal registries (e.g., internal NPM/Docker registries) and the specific testing databases provisioned for the ticket.
*   **Disabled Copy/Paste & Exfiltration:** Depending on the security posture, the workspace interface (often a browser-based IDE) may restrict clipboard operations to prevent code or data exfiltration.

## 3. The Enforcement Pipeline

The High-Integrity model is enforced at the version control and CI/CD level.

1.  **Pre-receive Hooks:** When a commit is pushed, the Git server verifies the commit signature against the active ticket assigned to the author.
2.  **Scope Validation:** The pipeline diffs the commit against the ticket's **Mutation Scope**. If an engineer modifies `auth_service.py` when the ticket only authorized changes to `payment_service.py`, the push is rejected outright.
3.  **Behavioral Constraints:** Engineers cannot merge their own code. They cannot trigger production deployments. They can only mark a ticket as "Ready for Validation," shifting the lifecycle to the automated systems or specialized QA roles.
