# AI Context Handoff & State Management

In a Zero-Trust architecture where AI Agents operate as autonomous team members, resiliency is critical. Because AI providers experience outages, rate limits, or context-window exhaustion, the system must support seamless handoffs between different AI models (e.g., from Claude to Gemini, or OpenAI to local models) without losing work or context.

To achieve this, AI Agents are strictly prohibited from relying exclusively on their proprietary, siloed memory streams. Instead, all context, workflows, and task progress must be externalized into standardized, repository-agnostic state files.

---

## 1. Task-Specific Context: The `.agent_state/` Directory

When an AI Agent is assigned an Atomic Task and spins up its isolated development sandbox, it must continuously document its execution state in a localized, standard format. This ensures that if the agent drops offline mid-task, the orchestration script can boot up a fallback agent (from a different provider) that instantly knows exactly where to resume.

### The State File Contract
Every active task must have a corresponding state file located at `.agent_state/TASK-[ID].md` within the root of the sandbox repository.

The AI Agent is required to update this file continuously during its execution loop. The file must contain:
1.  **Current Objective:** The specific sub-task the agent is actively trying to solve.
2.  **Completed Steps:** A checklist of files successfully modified, linted, and locally tested.
3.  **Current Blockers:** Any errors the agent is currently stuck on (e.g., "The linter is failing in `src/api/auth.ts` due to a strict typing issue on line 42").
4.  **Next Steps:** The explicit plan for what the agent intends to do next.

### The Handoff Execution
If the primary AI model times out or crashes, the Zero-Trust Orchestration Script automatically:
1. Detects the failure and spins down the crashed agent.
2. Provisions a fallback AI Agent (e.g., switching from Claude 3.5 Sonnet to Gemini 1.5 Pro) with identical JIT credentials.
3. Injects the contents of `.agent_state/TASK-[ID].md` directly into the fallback agent's initial prompt with the instruction: *"Read the current state and resume execution from the 'Next Steps'."*

---

## 2. Role-Specific Knowledge: The Shared `vector.json` Repository

While `.agent_state/` handles the ephemeral context of a single ticket, AI Agents also need long-term, specialized knowledge about their assigned Zero-Trust role (e.g., how an *API Engineer* formats routes, or how a *Security Engineer* configures WAF rules).

### The Dedicated Knowledge Repository
To prevent agents from hallucinating company policies or writing non-idiomatic code, all organizational knowledge, architectural standards, and role-specific workflows are stored in a completely separate, dedicated **Role Knowledge Repository**.

*   This repository acts as the central brain for all autonomous agents.
*   Human Technical Architects and Security Engineers maintain this repository via standard PR reviews.

### The `vector.json` Implementation
Within this dedicated repository, knowledge is compiled into a standardized `vector.json` file (or a set of structured JSON files mapped to specific roles).

1.  **Knowledge Retrieval:** When an AI Agent is initialized for a task, the Orchestration Script fetches the `vector.json` specific to the agent's assigned role (e.g., `roles/api_engineer_vector.json`).
2.  **RAG (Retrieval-Augmented Generation):** The agent uses standard file read tools to ingest this JSON data. Because it is formatted as structured text/JSON, it is universally readable by Claude, Gemini, OpenAI, or any open-source CLI agent.
3.  **Continuous Learning:** If an AI Agent figures out a highly optimized workflow or discovers a recurring undocumented constraint in the codebase, it can generate a PR against the Role Knowledge Repository to update the `vector.json`. Once approved by a human Architect, that new knowledge becomes permanently available to all future agents assuming that role.

### Separation of Concerns (Zero-Trust Data Security)
*   The **Code Repository** contains only application code and the ephemeral `.agent_state/`.
*   The **Role Knowledge Repository** contains only workflows, style guides, and the `vector.json` memory banks. 
*   This physical separation guarantees that an agent's generalized training data or memory files can never accidentally leak raw production code, secrets, or customer PII into the permanent knowledge base.