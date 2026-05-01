# Zero-Trust Ticket Creation & Lifecycle

In the Zero-Trust Chain of Command architecture, a project management ticket is not merely a description of work to be done. It is the foundational security boundary. A ticket acts as a **cryptographic access token**, dynamically defining what an engineer can see, what they can modify, and how long they have access to do it.

This document outlines the strict rules and metadata required to create and manage tickets within this environment.

---

## 1. The Three-Tier Ticket Hierarchy & Workflow Progression

To maintain separation of concerns and ensure rigorous planning before execution, the project management layer is divided into three distinct tiers. Tickets must follow a strict, top-down workflow progression where child tickets are only created and executed when their parent tickets reach the appropriate state.

### A. Epics (The "Why" / Strategic Layer)
*   **Purpose:** Defines the *Why*. High-level strategic initiatives (e.g., "Core AI Platform v1").
*   **Workflow Progression:** Epics are created first. They must be thoroughly planned in the Backlog. Only when the initiative is fully approved for active development is the Epic's status changed to **In Progress**.
*   **Authorized Creators:** Architects, Core PMs, Technical PMs, AI PMs, Growth PMs, Data PMs.
*   **Security Posture:** Epics do not grant access to codebase or infrastructure. They serve as containers for Stories.

### B. Stories (The "What" / Feature Layer)
*   **Purpose:** Defines the *What*. User-centric feature requirements and architectural specifications.
*   **Workflow Progression:** Stories are only created once their parent Epic is **In Progress**. They start in the Backlog/ToDo state where they are heavily discussed and edited collaboratively via the ticket comments. Once the requirements are perfectly defined and agreed upon, the Story is moved to **In Progress**.
*   **Authorized Creators:** Architects, Product Managers, Security Engineers, Data Scientists, Analysts.
*   **Security Posture:** Stories do not grant access to the codebase. They define the acceptance criteria that the resulting code must pass.

### C. Tasks (The "How" / Execution Layer / The Atomic Ticket)
*   **Purpose:** Defines the *How*. The granular, atomic unit of execution detailing the specific technical implementation.
*   **Workflow Progression:** Tasks are created in the **Backlog** under an **In Progress** Story. Here, they undergo a final round of technical discussion and refinement in the comments. Once a Task is perfectly scoped and ready for execution, it is moved to **ToDo**. It is at this precise moment that the Task enters the active queue to be picked up by the designated AI Agent (who will then move it to **In Progress** and begin coding).
*   **Authorized Creators:** Architects, Product Managers, Security Engineers, Identity Engineers.
*   **Restriction:** Core Engineers (Human or AI) **cannot** create Tasks to prevent unauthorized self-assignment. They can only transition assigned Tasks to "In Progress" or "In Review".

---

## 2. Anatomy of the Zero-Trust Atomic Task

When a Task is created, it must contain strict, machine-readable metadata. If a Task lacks any of these fields, the CI/CD pipeline and IAM provisioning systems will reject it, and no development sandbox will be created.

### Required Task Metadata:

1.  **Clear Text Description:** Human-readable explanation of the work (e.g., "Add email validation to the user registration endpoint").
2.  **Assigned Role & Identity:** The specific individual (Human or AI Agent) assigned to the task, validated against their authorized role. 
    *   *Human Example:* `user: jane.doe@company.com`, `role: API Engineer`
    *   *AI Example:* `user: ai-agent-alpha`, `role: Functional QA Eng.`
3.  **Resource Scope (Read Access):** Explicit URIs, file paths, or specific mocked database tables the assignee is allowed to read to gain context.
    *   *Example:* `allow_read: ['src/api/auth/**', 'tests/api/auth/**', 'mock_db:users_table']`
4.  **Mutation Scope (Write Access):** The strict, explicit list of files or infrastructure paths the assignee is permitted to modify.
    *   *Example:* `allow_write: ['src/api/auth/register.ts', 'tests/api/auth/register.test.ts']`
5.  **Time-to-Live (TTL):** A hard deadline (e.g., 4 hours, 2 days). Once the TTL expires, the engineer's ephemeral JIT (Just-In-Time) credentials are automatically revoked, and the sandboxed workspace is destroyed, regardless of task completion.
6.  **Required Deliverables:** Machine-readable checklist of deliverables required to close the task (e.g., `require: [Unit/Int Tests, Backend Code]`).
7.  **Designated Reviewers:** The explicitly assigned roles and identities responsible for reviewing the resulting Pull Request (e.g., `reviewers: [role: Functional QA Eng., user: john.smith@company.com]`).
8.  **Priority & Dependencies (Blocked By / Blocking):** Strict tracking of execution order. Specifies if this task is waiting on another task (`blocked_by`) or if it is holding up another task (`blocking`), driving automated priority escalations.

### AI Agent Specific Metadata:
When a Task is assigned to an AI Agent instead of a human, the Architect or Product Manager creating the ticket must append the following fields to ensure cost efficiency and structural predictability:

9.  **Authorized AI Model:** The specific Large Language Model (LLM) the agent is permitted to invoke to execute this task. This is selected by the PM/Architect based on the complexity of the task (e.g., a simple linting task gets a fast, cheap model, while complex architectural generation gets an advanced reasoning model).
    *   *Example:* `model: gemini-1.5-pro`
10. **Token Usage Ceiling (Budget):** A hard limit on the total number of tokens the AI Agent is allowed to burn. This value is injected into the agent's system prompt to enable **Budget-Aware Prompting**, forcing the agent to optimize its execution strategy (e.g., selective file reads and turn minimization) to stay within the limit.
    *   *Example:* `max_tokens: 150000`
11. **Token Usage Reporting:** Upon submission, the AI Agent must populate this field with its actual total token consumption for FinOps auditing.

---

## 3. The Ticket-Driven Enforcement Pipeline

The lifecycle of the Atomic Task drives the entire security apparatus of the organization.

1.  **Draft/Assign:** A Technical PM creates a Task, defines the strict Read/Write scopes, and assigns it to an API Engineer. No access is granted yet.
2.  **In Progress (Provisioning):** The API Engineer clicks "Start Task."
    *   The IAM system generates ephemeral credentials.
    *   The orchestration system spins up an isolated, sandboxed Cloud Workspace.
    *   The Virtual File System (VFS) mounts *only* the files explicitly listed in the Resource and Mutation scopes. The rest of the monorepo does not exist in this environment.
3.  **Execution:** The engineer writes code. If they attempt to open or modify a file outside their Mutation Scope, the VFS throws a `Permission Denied` error.
4.  **Review/Done (Submission):** The engineer submits their code.
    *   **Cryptographic Chain of Custody:** The commit is signed using the ephemeral credentials tied directly to the Jira/Linear Task ID.
    *   **Pre-Receive Hook Audit:** The Git server intercepts the push. It reads the Task ID from the commit, queries the ticket system, and verifies that the modified files match the ticket's `allow_write` scope exactly.
    *   **Rejection:** If the engineer modified an unauthorized file, the push is rejected outright, and an alert is sent to the Security Engineer.
5.  **Closure:** Upon successful CI/CD validation and QA sign-off (on a separate QA task), the task is closed, and all associated ephemeral environments and tokens are cryptographically destroyed. permissions to "do it themselves." 

### The Blocked Workflow & Follow-Up Tasks
When an assignee discovers they cannot complete a task without an upstream dependency (e.g., an API Engineer realizes they need the Database Admin to provision a new mock table schema):

1.  **Status Shift:** The assignee marks their current task as **"Blocked"**.
2.  **Dependency Ticket Creation:** A new, distinct Atomic Task is created and assigned to the required specialized role (e.g., Database Admin). If the required role belongs to a non-team member or external team, this follow-up task is routed to the **Dependency Manager**, who officially scopes and places it in the external project queue.
3.  **Metadata Linking:** The original task metadata is explicitly updated to specify `blocked_by: [NEW-TASK-ID]`. The newly created task specifies `blocking: [ORIGINAL-TASK-ID]`.
4.  **Priority Escalation:** The orchestration system automatically reads the `blocking` metadata. If the original task had a high priority, the newly created dependency task automatically inherits or mathematically exceeds that priority to rapidly clear the bottleneck.
5.  **Environment Suspension:** Because the original task is blocked, the original assignee loses their active ephemeral sandbox (pausing the Time-To-Live). The sandbox is only re-provisioned once the blocking task successfully transitions to "Done".