import Docker from 'dockerode';
import { db } from './db';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

export class DockerService {
  static async spawnWorker(ticketId: string) {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId) as any;
    if (!ticket) throw new Error('Ticket not found for spawning worker');

    const containerName = `worker-${ticket.identifier.toLowerCase()}`;
    const repoPathHost = `/app/repos/${ticket.repo_url ? ticket.repo_url.split('/').pop()?.replace('.git', '') : 'api'}`; // Simplified

    console.log(`Spawning Docker worker for ticket ${ticket.identifier}...`);

    try {
      // 1. Check if container already exists
      const existingContainer = docker.getContainer(containerName);
      try {
        const info = await existingContainer.inspect();
        if (info.State.Running) {
          console.log(`Worker ${containerName} is already running.`);
          return info.Id;
        } else {
          console.log(`Starting existing worker ${containerName}...`);
          await existingContainer.start();
          return info.Id;
        }
      } catch (e) {
        // Container doesn't exist, proceed to create
      }

      // 2. Create container
      const container = await docker.createContainer({
        Image: 'hiad-agent-worker', // Generic agent image
        name: containerName,
        Tty: true,
        Env: [
          `TICKET_ID=${ticket.id}`,
          `AGENT_ROLE=${ticket.llm_role}`,
          `LLM_PROVIDER=${ticket.authorized_model}`,
          `ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY || ''}`,
          `GOOGLE_API_KEY=${process.env.GOOGLE_API_KEY || ''}`
        ],
        HostConfig: {
          Binds: [
            `${repoPathHost}:/app` // Mount cloned repo
          ]
        }
      });

      // 3. Start container
      await container.start();
      const containerId = (await container.inspect()).Id;

      // 4. Update database
      db.prepare('UPDATE tickets SET assigned_agent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(containerId.substring(0, 12), ticketId);

      console.log(`Worker container spawned: ${containerId.substring(0, 12)}`);
      return containerId;

    } catch (error: any) {
      console.error('Failed to spawn worker:', error);
      throw error;
    }
  }

  static async stopWorker(ticketId: string) {
      // Implementation for stopping worker when moving to In Review
  }
}
