# PRD: Agentic Engineering HQ

## 1. Overview
The Agentic Engineering HQ is a centralized platform designed to manage autonomous AI software engineers (Agents) for any software project. It provides a robust, Dockerized system featuring a Web UI for monitoring, assigning, and validating AI-driven development tasks across local and remote environments.

## 2. Core Workflows

### 2.1. Project Initiation & State Management
- **Universal Import**: Support importing existing code and tickets from platforms like Linear, Jira, or GitHub.
- **Fresh Projects**: Capability to initialize a new project from scratch without any external source dependency.
- **Local Source of Truth**: SQLite handles the internal state, including agent assignments, role-specific metadata, and execution flags.
- **Phase-Based Lifecycle**: Guidance through Planning, Local Dev, Collaboration, Staging, and Operations.

### 2.2. Git Lifecycle
- **Dynamic Branching**: Upon moving to "In Progress", the system automatically creates a feature branch in the target repository.
- **Repository Management**: Repositories are cloned/mounted into a persistent volume accessible by the orchestrator and task workers.
- **Commit & Push**: AI Agents perform atomic commits with the ticket ID in the message and push them to the remote origin.
- **Pull Requests**: Once a task is marked complete, the orchestrator automatically generates a PR.

### 2.3. Agent Execution (Worker Containers)
- **Task Isolation**: For every assigned task, the orchestrator spawns a new Docker worker container.
- **Environment**: The target repository is mounted into the worker.
- **Model Support**: Support for both Claude (Anthropic) and Gemini (Google) models with secure credential injection.
- **Lifecycle**:
    - **In Review**: When a task is submitted, the worker container is stopped.
    - **Reactivation**: If feedback is received (comments on PR/ticket), the specific task container is reactivated to apply fixes.
    - **Done**: Container is decommissioned once the ticket reaches "Done".

## 3. Web UI Requirements
- **Dashboard**: High-level view of all synced tickets and their statuses.
- **Ticket Detail**: View description, select an AI model (Claude/Gemini), and assign an AI Role.
- **Agent Monitor**: Real-time log streaming from active worker containers.
- **Settings**: Manage API keys (Linear, Anthropic, Google) and Git credentials.

## 4. Technical Architecture
- **Control Plane**: Next.js application (App Router) serving both the UI and the API.
- **Database**: SQLite for task state and persistent configuration.
- **Container Orchestration**: Docker-from-Docker (mounting `/var/run/docker.sock`) to manage worker lifecycles.
- **Networking**: Shared Docker network for internal communication between control plane and workers if needed.
