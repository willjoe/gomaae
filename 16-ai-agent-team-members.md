# AI Agent Team Members & Autonomous Workflow

In the High-Integrity Atomic Development, AI Agents are treated as first-class, autonomous team members. They operate under the exact same cryptographic, networking, and role-based restrictions as human engineers. 

To enable AI Agents to participate automatically and asynchronously in the software development lifecycle, a strict, event-driven orchestration layer manages their execution, provisioning, and fallback protocols.

---

## 1. Ticket-Driven Activation

AI Agents do not run on scheduled cron jobs or constantly poll the repository. Their execution is strictly **event-driven** and triggered by the project management ticket system.

### The Metadata Contract
When a Technical PM or Architect scopes an Atomic Task for an AI, they populate the specific AI metadata fields:
*   **Role:** The High-Integrity role the agent will assume (e.g., `role: API Engineer`, `role: Functional QA Eng.`).
*   **Assigned User:** The specific agent identity (e.g., `user: agent-backend-alpha`).
*   **Authorized Model:** The designated LLM to execute the task (e.g., `model: gemini-1.5-pro`).
*   **Token Ceiling:** The maximum allowable token burn for this execution.

### The Trigger Event
The orchestration begins the moment the Architect or PM transitions the ticket status from `Draft/Assigned` to `In Progress`. This status change fires a secure webhook to the internal **Agent Orchestration Script**.

---

## 2. The Orchestration & Fetching Process

Upon receiving the `In Progress` webhook, the Agent Orchestration Script initializes the AI worker environment.

1.  **Identity Provisioning:** The script requests ephemeral JIT credentials from the Identity system for the designated AI Agent.
2.  **Branch Creation:** The script clones the central trunk and creates a dedicated, isolated feature branch for the task (e.g., `feat/agent-alpha/TASK-1234`).
3.  **Sandbox Initialization:** An isolated Virtual File System (VFS) is spun up, mounting only the files explicitly listed in the ticket's `allow_read` and `allow_write` scopes.

### 3. Model Fallback & Resiliency Protocol
To guarantee high availability and prevent pipeline blockers if a specific AI provider experiences an outage, rate-limiting, or an air-gapped network partition, the Orchestration Script implements a dynamic fallback matrix culminating in a local "Ultimate Fallback."

*   **Primary Attempt:** The script attempts to instantiate the agent using the exact cloud `model` defined in the ticket metadata (e.g., `gemini-1.5-pro`).
*   **Similar-Capability Cloud Fallbacks:** If the primary model's API is unreachable, the script automatically shifts the agent to a pre-approved, comparably capable cloud fallback from a different provider (e.g., Anthropic or OpenAI).
*   **The Ultimate Fallback (Air-Gapped Local LLM):** If all cloud providers fail or the network is partitioned, the script intercepts the failure and seamlessly points the agent's API base URL to an internal, local LLM server. Because the agent relies on standardized `.agent_state` markdown files and `vector.json` roles (not proprietary cloud memory), the local model picks up the context instantly.

#### Local Fallback Implementation (Ollama)
The internal fallback server runs **Ollama**, which exposes a local API (`http://internal-gpu-server:11434/v1`) that natively mimics the OpenAI API format. The Orchestration Script simply redirects its API calls to this local endpoint.

The specific fallback model booted by Ollama depends on the organization's internal hardware tier:

1.  **Standard Hardware Tier (8GB - 16GB VRAM):** For agents running locally on standard engineer laptops (M1/M2 or RTX 3060/4060):
    *   **Llama 3.1 (8B):** A massive 128k context window, ideal for general logic, RAG, and reading extensive repository context.
    *   **Qwen 2.5 Coder (7B):** Dominant in coding benchmarks for its size. Ideal if the agent strictly needs to fix linting errors or generate bounded backend code.
2.  **High-End Internal Server Tier (24GB - 64GB VRAM):** For agents executing on an internal orchestration rig (Mac Studio, M3 Max, or 2x RTX 3090/4090 servers):
    *   **Qwen 2.5 Coder (32B):** The primary recommended local fallback. Rivals top-tier cloud models in coding capability without requiring massive data center racks.
    *   **DeepSeek Coder V2 (Lite / 16B):** A highly optimized Mixture-of-Experts (MoE) model. Runs incredibly fast while maintaining advanced coding and mathematical logic.
    *   **Mistral Nemo (12B):** A fantastic generalist model. Ideal for agents acting as PMs, Analysts, or Architects that require broad summarization capabilities.

*   **Audit Logging:** Any fallback event (whether to a secondary cloud provider or a local Ollama model) is permanently logged in the ticket's metadata so the FinOps Engineer and PM know exactly which model ultimately executed the task.

---

## 3. Autonomous Execution under High-Integrity

Once the environment is initialized and the model is connected, the AI Agent acts identically to a human engineer constrained by the High-Integrity architecture, with the added layer of **Budget-Aware Planning**.

1.  **Budget-Aware Context Gathering:** The agent receives its token ceiling via the system prompt. It optimizes its initial discovery phase by using high-efficiency tools (like `grep_search`) to find the exact code blocks required, rather than performing expensive full-file reads that would consume its budget prematurely.
2.  **Selective Context Gathering:** The agent reads the ticket description and reads the files explicitly granted in the `allow_read` scope. If the agent hallucinates a file path outside its scope, the VFS blocks the read attempt.
3.  **Strategic Code Generation:** The agent synthesizes the required logic. If the task is large, the agent may break the work into multiple granular commits (as per our **Semantic Commit Granularity** mandate) to ensure progress is saved before the budget or TTL expires.
4.  **Local Validation:** The agent executes the local sandbox tests and linters.
5.  **The Pre-Commit Gate:** The agent cryptographically signs its commit using its JIT credentials.

---

## 4. Submission and Hand-Off

Once the AI Agent has successfully executed the task and passed the local pre-commit gauntlet, the automated submission sequence fires:

1.  **Token Accounting:** The Orchestration Script calculates the total tokens consumed during the execution (including any fallback model usage) and writes the final integer back to the ticket's `Token Usage Reporting` metadata field.
2.  **Pull Request Creation:** The script pushes the branch to the remote repository and opens a Pull Request.
3.  **Status Transition:** The ticket is automatically moved from `In Progress` to `Review/Done`.
4.  **Sandbox Destruction:** The AI Agent's ephemeral credentials are computationally destroyed, and its isolated sandbox is torn down.

From this point forward, the PR enters the standard **Ticket-Driven Review Assignment** phase. The AI Agent has absolutely no ability to merge its own code; it must wait for the explicitly assigned QA Engineers and Architects to review the diff and run the CI/CD integration tests, enforcing the ultimate High-Integrity mandate.

---

## 5. Routine Usage of Local LLMs (Daily Reporting)

While local LLMs act as the "Ultimate Fallback" for complex coding and architectural tasks during cloud outages, they are actively utilized for **routine, daily administrative tasks** as a primary cost-efficiency and privacy measure.

### Automated Summarization
Rather than burning expensive cloud tokens for simple text processing, the Orchestration Script regularly spins up lightweight local LLMs (e.g., Llama 3.1 8B or Mistral Nemo) to generate the required Daily Reports.

*   **Ticket-Driven Processing:** At the end of the day, the local model parses the updates, comments, `.agent_state` files, and semantic commits associated with all active and recently closed tickets.
*   **Concise Output:** The local agent is strictly prompted to generate only a few sentences. It produces highly concise daily reports formatted:
    *   **Per Task:** The current status, blockers, and semantic progress of the atomic ticket.
    *   **Per Individual:** A brief bullet point of what a specific engineer (or AI agent) completed today.
    *   **Per Team:** A rolled-up summary of the specific domain's overall velocity and blockers.
*   **High-Integrity Privacy:** Because this reporting involves aggregating data across multiple tickets, blockers, and developer activity, keeping this summarization local ensures that internal team velocities, individual working patterns, and operational metadata are not unnecessarily streamed to external cloud providers.