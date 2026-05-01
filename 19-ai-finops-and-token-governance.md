# AI FinOps & Token Governance

In a Zero-Trust environment where autonomous AI Agents execute high volumes of tasks, token consumption becomes a primary operational cost and a potential vector for runaway resource exhaustion. 

This document defines the automated FinOps governance, the "Budget-Aware" execution model, and the hard kill-switches enforced by the Master Orchestrator.

---

## 1. Budget-Aware Agent Prompting

The token budget defined in an Atomic Task is not just a passive limit; it is an active constraint that shapes the agent's behavior.

1.  **System Prompt Injection:** When the Orchestrator initializes an AI Agent, it injects a high-priority "Budget Header" into the system prompt:
    > *"You are operating on a strict budget of [N] tokens for this task. You must optimize your execution strategy. Prioritize selective file reads, minimize unnecessary turns, and ensure the task is completed before the budget is exhausted."*
2.  **Agentic Planning:** The agent uses this information to decide its depth of exploration. For a small budget, the agent will favor surgical `grep_search` and targeted `read_file` calls over broad directory listings or full-file reads.
3.  **Proactive Scaling:** If an agent calculates that it cannot complete the task within the remaining budget, it is instructed to:
    *   Stop execution before the hard kill-switch triggers.
    *   Document its progress in the `.agent_state` file.
    *   Comment on the ticket requesting a budget increase or human intervention.

---

## 2. Real-Time Token Monitoring & Kill-Switches

The Master Orchestrator acts as a transparent proxy for all LLM API calls, providing real-time enforcement of the token ceiling.

1.  **Interceptive Accounting:** Every request and response between the AI Agent and the LLM provider passes through the Orchestrator. The Orchestrator parses the usage metadata returned by the provider (Input/Output/Cached tokens).
2.  **Cumulative Tracking:** The Orchestrator maintains a running total of tokens consumed for the specific Task ID.
3.  **The Kill-Switch Trigger:** If the cumulative total exceeds the `max_tokens` defined in the ticket:
    *   The Orchestrator blocks any further API requests from that sandbox.
    *   It returns a hard error to the agent: `ERROR: Token budget exhausted ([N] tokens). Task terminated.`
    *   The sandbox is immediately suspended.
4.  **Failure Notification:** The Orchestrator automatically posts a "Budget Exhausted" alert to the ticket and notifies the **FinOps Engineer** and the **Technical PM**.

---

## 3. Reporting and Auditing

At the conclusion of every task (whether successful, failed, or killed), the Orchestrator executes the final FinOps reporting loop.

1.  **Ticket Metadata Sync:** The final, audited token count is written to the `Token Usage Reporting` field on the ticket.
2.  **Fallback Cost Attribution:** If the agent utilized the **Model Fallback Protocol** (switching to Flash or a local model), the Orchestrator calculates the specific cost distribution across providers.
3.  **FinOps Dashboard Integration:** These metrics are streamed to the central FinOps Dashboard, allowing the organization to track ROI per role, per team, and per AI model, enabling data-driven decisions on model selection for future tickets.
