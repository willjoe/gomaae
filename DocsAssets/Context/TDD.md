# Technical Design Document: AI Orchestrator

## 1. System Components

### 1.1. Control Plane (Next.js)
- **UI**: Dashboard for ticket management and agent monitoring.
- **API Routes**:
    - `/api/tickets`: Sync and list tickets from SQLite.
    - `/api/agents`: Manage worker container lifecycles (spawn, stop, restart).
    - `/api/git`: Repository cloning and branching operations.
    - `/api/config`: Secure storage of API keys in encrypted SQLite or environment variables.

### 1.2. Database (SQLite)
- **Schema**:
    - `tickets`: `id`, `identifier`, `title`, `description`, `status`, `assigned_agent_id`, `branch_name`, `repo_url`.
    - `agents`: `id`, `name`, `role`, `llm_provider`, `container_id`, `status`.
    - `logs`: `id`, `ticket_id`, `agent_id`, `log_line`, `timestamp`.

### 1.3. Worker Containers (Docker)
- **Base Image**: A customized Node.js image containing `git`, `ssh` clients, and the agent logic (Claude Code / Gemini API bridge).
- **Volume Mounts**: The specific feature branch directory is mounted from the host (or a shared volume) into `/app`.
- **Environment Injection**: `ANTHROPIC_API_KEY` or `GOOGLE_API_KEY` passed at runtime.

## 2. Workflows

### 2.1. Task Initiation
1. User selects a "Todo" ticket in the UI.
2. User clicks "Start Task" and selects:
    - **Agent Role** (e.g., Frontend Engineer).
    - **LLM** (e.g., Claude 3.5 Sonnet).
3. Orchestrator:
    - Creates a Git branch: `task/[identifier]-[slug]`.
    - Spawns a Docker container using `dockerode`.
    - Writes initial `.agent_state/` files into the branch.
    - Starts the agent process inside the container.

### 2.2. Submission & Review
1. Agent completes work and triggers a `push`.
2. Orchestrator detects the push (or agent signals completion via API).
3. Orchestrator creates a Pull Request via GitHub/GitLab API.
4. Ticket status moves to "In Review".
5. Worker container is stopped (`docker stop`).

### 2.3. Feedback Loop
1. Human reviewer adds comments.
2. User clicks "Re-run Agent" in UI.
3. Orchestrator starts the existing container (`docker start`) and passes the feedback as a new prompt.
4. Agent applies fixes and pushes again.

## 3. Implementation Plan
1. **Phase 1**: SQLite initialization and Linear sync logic (reused from previous scripts).
2. **Phase 2**: Next.js Dashboard UI with Tailwind CSS.
3. **Phase 3**: Dockerode integration for container management.
4. **Phase 4**: Git lifecycle integration (using `simple-git` or similar).
