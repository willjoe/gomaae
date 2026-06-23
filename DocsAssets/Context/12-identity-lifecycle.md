# Identity Lifecycle: Onboarding, Offboarding, and Transfers

In a Agentic Engineering, identity is the absolute perimeter. An engineer's identity dictates strictly what they can and cannot do. This document outlines the lifecycle of user identities and their integration with Cloud Identity and Access Management (IAM).

---

## 1. The 1:1 IAM Role Mapping

Every user identity (Human or AI Agent) within the organization is mapped 1:1 to a predefined High-Integrity role.

*   **Strict Alignment:** There are no "custom" permission sets or ad-hoc access grants. When an identity is created, it is assigned a primary role (e.g., `API Engineer`, `Data Scientist`, `FinOps Engineer`) based exactly on the established organizational role definitions.
*   **Matrix Enforcement:** The assigned role automatically maps to a strict set of IAM permissions as defined in the Cloud Access Credential Matrix. 
*   **Zero Standing Access:** Assigning a role to an identity *does not* grant them permanent access to the codebase or raw data. The role merely dictates what type of JIT (Just-In-Time) ephemeral credentials they are *authorized to request* via an Atomic Task ticket.

---

## 2. Onboarding (Foundational Identity Creation)

When a new engineer or AI Agent joins the organization, their foundational identity is established without granting any standing access to critical systems.

1.  **HR / Automated Trigger:** An HR system (for humans) or orchestration script (for AI Agents) signals the creation of a new identity.
2.  **Role Assignment:** The Identity Engineer provisions the base identity (e.g., Google Workspace/Cloud Identity account) and strictly binds it to the predefined IAM role group (e.g., `group: qa-functional-engineers`).
3.  **SSO & Hardware Tokens:** For human engineers, Single Sign-On (SSO) and hardware-backed MFA (e.g., YubiKey) are enforced immediately.
4.  **Sandbox Readiness:** The engineer can now log into the project management system to receive Atomic Tasks. They have zero access to cloud infrastructure, code repositories, or databases until their first task is assigned and transitioned to "In Progress".

---

## 3. Lateral Transfers (Role Changes)

When an engineer moves between teams or specializations (e.g., moving from Frontend Web Engineer to API Engineer), their permissions must shift instantly to prevent access accumulation (privilege creep).

1.  **Transfer Request:** A ticket is created detailing the role transfer, approved by the relevant managers or architects.
2.  **Instant Revocation:** The Identity Engineer's automated systems instantly strip the identity of its previous IAM role binding (e.g., removing them from `group: frontend-web-engineers`).
3.  **New Role Binding:** The identity is concurrently bound to the new IAM role (e.g., `group: api-engineers`).
4.  **Active Task Termination:** Any open or "In Progress" Atomic Tasks assigned to the engineer under their old role are forcefully closed, and their associated ephemeral environments and credentials are cryptographically destroyed.

---

## 4. Offboarding (The Automated Kill-Switch)

Offboarding in a High-Integrity environment must be instantaneous and absolute.

1.  **Termination Signal:** When HR or a manager issues a termination signal, an automated webhook triggers the Identity system.
2.  **Identity Suspension:** The user's core identity (SSO session, Cloud Identity account) is instantly suspended.
3.  **Credential Destruction:** All active ephemeral JIT tokens, API keys, and active sandbox environments tied to that identity are immediately revoked and destroyed.
4.  **Audit Preservation:** The Identity Engineer retains the audit logs of the user's historical access and ticket executions for compliance and security reviews, but the identity itself is mathematically severed from the infrastructure.