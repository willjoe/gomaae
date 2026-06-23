import { db, getActiveProjectRoot } from '../db';
import Docker from 'dockerode';
import path from 'path';
import { prepareTicketWorkspace } from '../workspace';

/**
 * Spawns a sandboxed Docker worker for a specific ticket.
 * Enforces high-integrity isolation:
 * - Mounts the 프로젝트 repository via bind-mount.
 * - Creates a ticket-specific Git branch.
 * - Injects the assigned agent's Role Vector.
 */
export async function spawnAgentWorker(ticketId: string) {
  const docker = new Docker({ socketPath: '/var/run/docker.sock' });
  
  try {
    // Check if Docker is actually available
    await docker.ping();
  } catch (pingErr) {
    console.warn('[Orchestrator] Docker daemon unavailable. Worker spawn bypassed.');
    return { success: false, error: 'Docker daemon not running' };
  }

  try {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId) as any;
    if (!ticket) throw new Error('Ticket not found');

    // 1. Resolve the active workstation root from the global config
    const workspaceRoot = getActiveProjectRoot();

    if (!workspaceRoot) throw new Error('Project workspace root not configured');

    const containerName = `worker-${ticket.identifier.toLowerCase()}`;
    const branchName = `ticket/${ticket.identifier.toLowerCase()}`;

    console.log(`[Orchestrator] Spawning worker for ${ticket.identifier} on branch ${branchName}`);

    // 2. Materialize a scoped per-ticket workspace (standardized ~/Agentic
    //    hierarchy: <workspaceRoot>/Workspaces/<TICKET>/repo). The agent gets a
    //    dedicated clone, never the whole project root.
    //    TODO: pass ticket.allowed_paths once the ticket schema carries it.
    const scopedRepo = await prepareTicketWorkspace(workspaceRoot, ticket.identifier);

    // 3. Define Container Configuration
    const containerConfig = {
      Image: 'orchestrator-worker', // Pre-built in project
      name: containerName,
      Env: [
        `TICKET_ID=${ticket.id}`,
        `TICKET_IDENTIFIER=${ticket.identifier}`,
        `AGENT_ROLE=${ticket.llm_role || 'Unassigned'}`,
        `GIT_BRANCH=${branchName}`,
        `OLLAMA_HOST=${process.env.OLLAMA_HOST || 'http://host.docker.internal:11434'}`
      ],
      HostConfig: {
        Binds: [
          `${scopedRepo}:/app/workspace` // Mount ONLY the ticket-scoped clone
        ],
        NetworkMode: 'bridge'
      },
      Cmd: ['node', 'agent-runner.js']
    };

    // 3. Create and Start Container
    const container = await docker.createContainer(containerConfig);
    await container.start();

    // 4. Update Agent Registry in project-local DB
    db.prepare('INSERT OR REPLACE INTO agents (id, name, role, status, container_id) VALUES (?, ?, ?, ?, ?)')
      .run(ticket.id, `Agent-${ticket.identifier}`, ticket.llm_role, 'Running', container.id);

    console.log(`[Orchestrator] Worker started: ${container.id}`);
    return { success: true, containerId: container.id };

  } catch (error: any) {
    console.error('[Orchestrator] Failed to spawn worker:', error);
    return { success: false, error: error.message };
  }
}
