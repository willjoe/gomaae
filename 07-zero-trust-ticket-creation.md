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
*   **Workflow Progression:** Tasks are created in the **Backlog** under an **In Progress** Story. Once a Task is perfectly scoped and ready for execution, it is moved to **ToDo**. **This transition is the Universal Trigger for development and JIT provisioning.** Once the development environment is successfully initialized, the status is automatically updated to **In Progress**.
*   **Authorized Creators:** Architects, Product Managers, Security Engineers, Identity Engineers.
*   **Restriction:** Core Engineers (Human or AI) **cannot** create Tasks to prevent unauthorized self-assignment. They can only transition assigned Tasks to "In Progress" or "In Review".

---

## 2. Anatomy of the Zero-Trust Atomic Task

When a Task is created, it must contain strict, machine-readable metadata. If a Task lacks any of these fields, the CI/CD pipeline and IAM provisioning systems will reject it, and no development sandbox will be created.

### Required Task Metadata:

1.  **Clear Text Description:** Human-readable explanation of the work (e.g., "Add email validation to the user registration endpoint").
2.  **Assigned Role & Identity:** The specific individual (Human or AI Agent) assigned to the task.
3.  **AI Automation Opt-In:** A mandatory boolean (`true/false`). If `false` (default), the task is strictly human-driven. If `true`, the Master Orchestrator will automatically assign and execute the task using an AI Agent.
4.  **Authorized AI Model:** The specific Large Language Model (LLM) mandated for this task. This field is mandatory for all tasks. For human-led tasks, it defines the "Local AI Assistant" model. For AI-led tasks (`Opt-In: true`), it defines the autonomous agent's model.

---

## 3. The Ticket-Driven Enforcement Pipeline

The lifecycle of the Atomic Task drives the entire security apparatus of the organization.

1.  **Backlog (Idle/Planning):** A Technical PM creates a Task and assigns it. The task sits in the "Backlog" queue. **No JIT environments are provisioned.** No credentials exist. This is the planning state.
2.  **ToDo (Activation Trigger):** The transition from **Backlog** to **ToDo** is the **Universal Provisioning Trigger**. 
    *   **Human Task (Default):** If `AI Automation Opt-In` is `false`, the IAM system detects the transition to **ToDo**, generates ephemeral credentials, and prepares the Virtual File System (VFS). The status is updated to **In Progress** once the JIT environment is ready for the human to bridge in via the **`zt-cli`**.
    *   **AI Task:** If `AI Automation Opt-In` is `true`, the Master Orchestrator detects the transition to **ToDo**, boots the autonomous agent container, and begins execution. Once the agent's environment is ready, the Orchestrator updates the ticket to **In Progress**.
3.  **In Progress (Execution):** The engineer (human or AI) performs the work within the isolated sandbox.
4.  **In Review (Submission):** The engineer submits their code. This triggers the **Scoper Enforcement Gate** and the CI/CD Gauntlet.

### The Blocked Workflow & Follow-Up Tasks
When an assignee discovers they cannot complete a task without an upstream dependency (e.g., an API Engineer realizes they need the Database Admin to provision a new mock table schema):

1.  **Status Shift:** The assignee marks their current task as **"Blocked"**.
2.  **Dependency Ticket Creation:** A new, distinct Atomic Task is created and assigned to the required specialized role (e.g., Database Admin). If the required role belongs to a non-team member or external team, this follow-up task is routed to the **Dependency Manager**, who officially scopes and places it in the external project queue.
3.  **Metadata Linking:** The original task metadata is explicitly updated to specify `blocked_by: [NEW-TASK-ID]`. The newly created task specifies `blocking: [ORIGINAL-TASK-ID]`.
4.  **Priority Escalation:** The orchestration system automatically reads the `blocking` metadata. If the original task had a high priority, the newly created dependency task automatically inherits or mathematically exceeds that priority to rapidly clear the bottleneck.
5.  **Environment Suspension:** Because the original task is blocked, the original assignee loses their active ephemeral sandbox (pausing the Time-To-Live). The sandbox is only re-provisioned once the blocking task successfully transitions to "Done".