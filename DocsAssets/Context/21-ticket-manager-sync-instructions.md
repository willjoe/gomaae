# 21. Ticket Manager Synchronization Architecture

This document outlines the architectural instructions and implementation steps for achieving a **bi-directional sync** between the local `ticket-manager.db` (SQLite) and external organizational ticketing systems like **Linear** or **Jira**.

In an Agentic Engineering environment, the local SQLite database acts as the high-speed, offline-capable source of truth for the Orchestrator and AI Agents, while Linear acts as the human-facing interface for Product Managers and stakeholders.

---

## 1. System Architecture

To achieve complete synchronization without race conditions, implement a **Sync Daemon** utilizing a combination of Webhooks (Real-time Inbound) and GraphQL API calls (Real-time Outbound & Polling).

### Components Required
1. **Sync Daemon (`ticket-monitor.js`)**: A background Node.js process that watches for changes in both the SQLite database and Linear.
2. **Linear Webhook Endpoint**: An Express.js route in the `sandbox-orchestrator` that receives push notifications from Linear.
3. **Linear GraphQL Connector (`linear-connector.js`)**: Handles translation of data models between Linear Issues and HIAD SQLite Tickets.

---

## 2. Data Mapping Strategy

You must map Linear's native fields to the High-Integrity Atomic Development schema defined in the SQLite database.

| SQLite Field (`tickets` table) | Linear API Field / Custom Field | Notes |
| :--- | :--- | :--- |
| `ticket_id` | `identifier` (e.g., ENG-123) | Primary Key. Must match exactly. |
| `subject` | `title` | |
| `body_text` | `description` | Markdown format. |
| `status` | `state.name` | Map Linear states (Triage, Todo, In Progress, Done) to SQLite states. |
| `tier` | *Custom Field* (Tier) | Map Linear standard issues to Epic/Story/Task. |
| `parent_id` | `parent.identifier` | For Epic/Story linking. |
| `assigned_role` | `assignee.name` / *Custom* | Map Linear assignee (e.g., "AI Frontend Engineer") to internal agent tag (`AI-FRONTEND-WEB-ENG`). |
| `repository` | *Custom Field* (Repository) | Defines which codebase the agent should mount. |
| `start_date` | `startDate` | |
| `due_date` | `dueDate` | |

### Unmapped Parameter Handling (YAML Injection)
Not all ticketing platforms support custom fields natively, or you may hit limits on the number of allowed custom fields. 

**The Rule:** If a parameter exists in the High-Integrity SQLite `tickets` schema (e.g., `execution_flag`, `authorized_ai_model`, `repository`) but cannot be natively mapped to a field in the external platform (like Linear), the `linear-connector.js` **MUST** append these parameters as a formatted YAML block at the very bottom of the ticket's `description` (body) field during the outbound sync.

**Example Outbound Body Formatting:**
```markdown
Update the primary button to use the new atomic design tokens.

---
**Agentic Execution Context**
```yaml
execution_flag: autonomous
authorized_ai_model: gemini-pro
repository: frontend-web
tier: Task
```
```

When performing an inbound sync (Linear -> SQLite), the webhook listener must parse this YAML block, extract the values to update the respective SQLite columns, and then strip the YAML block out before saving the `body_text` to the database to prevent duplication.

---

## 3. Implementation Steps

### Step 1: Configure Linear Webhooks (Inbound Sync)
Set up a webhook in your Linear workspace settings pointing to your Orchestrator (e.g., `https://your-internal-proxy.com/api/webhooks/linear`).

**Events to listen for:**
* `IssueCreated`
* `IssueUpdated`
* `IssueRemoved`

**Handling Logic:**
When the Orchestrator receives an `IssueUpdated` payload:
1. Extract the `identifier` and `updatedAt` timestamp.
2. Compare the timestamp against the `updated_at` field in SQLite.
3. If Linear is newer, execute an `UPDATE` or `INSERT` query on the SQLite database to overwrite the local state.
4. *Trigger:* If the status changed to "ToDo" and assignee starts with `AI-`, trigger `provisionSandbox()` to wake the agent.

### Step 2: Implement SQLite Watcher (Outbound Sync)
Since the `ticket-manager-ui.html` and AI Agents directly modify the SQLite database, the system must detect these changes and push them to Linear.

**Approach: Timestamp Polling**
1. Add a `sync_status` column to the SQLite `tickets` table (e.g., `synced`, `pending_update`).
2. Update the `saveTicket()` function in the HTML UI and the Agent Tools to set `sync_status = 'pending_update'` whenever a row is modified.
3. The background **Sync Daemon** runs every 5-10 seconds:
   ```sql
   SELECT * FROM tickets WHERE sync_status = 'pending_update';
   ```
4. For each result, the `linear-connector.js` fires a GraphQL mutation (`issueUpdate` or `issueCreate`) to Linear.
5. Upon successful API response, the daemon updates the local row to `sync_status = 'synced'`.

### Step 3: Extend `linear-connector.js`
In your existing `connectors/ticket-systems/linear-connector.js`, implement the following methods using the `@linear/sdk`:

```javascript
const { LinearClient } = require('@linear/sdk');
const sqlite3 = require('sqlite3').verbose();

class LinearSyncConnector {
  constructor(apiKey, dbPath) {
    this.linear = new LinearClient({ apiKey });
    this.db = new sqlite3.Database(dbPath);
  }

  // Called by the Webhook Listener
  async ingestFromLinear(linearIssuePayload) {
      // Map payload to SQLite Schema
      // Execute INSERT ON CONFLICT UPDATE ...
  }

  // Called by the Background Daemon
  async exportToLinear(localTicket) {
      // Map SQLite row to Linear mutation
      // e.g., this.linear.issueUpdate(localTicket.ticket_id, { stateId: ... })
      // Mark as synced locally
  }
}
```

## 4. Handling Conflict Resolution (Edge Cases)

* **Simultaneous Edits:** If a human updates the ticket in Linear while an AI Code Agent is actively working on it, prioritize **SQLite as the Source of Truth**. The Sync Daemon will push the agent's latest state, overwriting conflicting human edits in Linear. This prevents external changes from disrupting the agent's active execution context.
* **Agent Handoffs:** When an AI Agent finishes a PR, it updates the SQLite status to `In Review`. This instantly triggers the Sync Daemon to push the update to Linear, which then notifies human reviewers or triggers the next agent in the pipeline. 
* **UI Browser Cache:** The `ticket-manager-ui.html` runs in-memory. If using it as a primary interface, users must click "Save & Export DB" to commit changes to the `.db` file so the Sync Daemon can pick them up. Alternatively, convert the standalone UI into a lightweight Express app that queries the live `.db` file directly via REST instead of Wasm-in-memory to ensure real-time visibility.sure real-time visibility.` file directly via REST instead of Wasm-in-memory to ensure real-time visibility.