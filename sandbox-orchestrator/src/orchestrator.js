/**
 * Master Sandbox Orchestrator Engine
 * Listens to ticketing system queues, provisions secure Docker containers,
 * mounts isolated repositories, injects role vectors, and manages ticket states.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class SandboxOrchestrator {
  constructor() {
    this.queue = [];
    this.activeContainers = new Map();
  }

  /**
   * Simulated Webhook endpoint from Ticket System (Jira/Linear)
   */
  async handleTicketWebhook(ticketEvent) {
    if (ticketEvent.status === 'ToDo' && ticketEvent.assignee.startsWith('AI-')) {
      console.log(`[Webhook] Received new task ${ticketEvent.id} assigned to ${ticketEvent.assignee}. Added to queue.`);
      this.queue.push(ticketEvent);
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.queue.length === 0) return;

    const task = this.queue.shift();
    
    // 1. Update Ticket Status (ToDo -> In Progress)
    this.updateTicketStatus(task.id, 'In Progress');

    // 2. Fetch Agent Role Vector
    const roleVector = this.fetchAgentRoleVector(task.assignee);
    
    // 3. Provision the Sandbox Container
    try {
      await this.provisionSandbox(task, roleVector);
    } catch (error) {
      console.error(`[Orchestrator] Failed to provision sandbox for ${task.id}:`, error);
      // Fallback: Transition ticket to blocked/failed
      this.updateTicketStatus(task.id, 'Paused');
    }
  }

  updateTicketStatus(ticketId, newStatus) {
    console.log(`[Connector] Transitioning ticket ${ticketId} to '${newStatus}'`);
    // Implementation: Call the Linear/Jira Connector
  }

  fetchAgentRoleVector(assigneeId) {
    // Parse assignee ID to find the folder (e.g., 'AI-FRONTEND-WEB-ENG' -> 'frontend-web-eng')
    const folderName = assigneeId.replace('AI-', '').toLowerCase();
    const rolePath = path.join(__dirname, '..', '..', 'agent-roles', 'roles', folderName);
    
    if (!fs.existsSync(rolePath)) {
      throw new Error(`Role vector for ${folderName} not found.`);
    }
    
    console.log(`[Orchestrator] Fetched role vector for ${assigneeId}`);
    return rolePath;
  }

  async provisionSandbox(task, roleVectorPath) {
    const folderName = task.assignee.replace('AI-', '').toLowerCase();
    const containerName = `agent-${folderName}-${task.repository}`;
    console.log(`[Orchestrator] Provisioning/Waking container ${containerName} for task ${task.id}...`);

    // Determine container type based on environment (API Key vs CLI Login)
    const isProduction = process.env.NODE_ENV === 'production';
    const containerType = isProduction ? 'api-key' : 'cli-login';
    const dockerfileDir = path.join(__dirname, '..', 'containers', containerType);

    // Load the config to get sandbox parameters
    const configPath = path.join(roleVectorPath, 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const gitAuthor = config.access_scopes.vcs_attribution.GIT_AUTHOR_NAME;

    // Vector Context Paths
    // 1. Role Vector (Project-Agnostic, persistent role knowledge)
    const roleVectorJsonPath = path.join(roleVectorPath, 'vector.json');
    if (!fs.existsSync(roleVectorJsonPath)) {
      fs.writeFileSync(roleVectorJsonPath, JSON.stringify({ role_knowledge: [] }, null, 2));
    }
    
    // 2. Feature Vector (Project-Specific, for handoffs)
    const featureVectorDir = path.join(__dirname, '..', '..', 'project-features', task.repository);
    if (!fs.existsSync(featureVectorDir)) fs.mkdirSync(featureVectorDir, { recursive: true });
    const featureVectorJsonPath = path.join(featureVectorDir, 'vector.json');
    if (!fs.existsSync(featureVectorJsonPath)) {
      fs.writeFileSync(featureVectorJsonPath, JSON.stringify({ feature_context: {} }, null, 2));
    }

    // Strict Bind Mount: Only mount the specific repository required for the ticket
    // E.g., /opt/repositories/frontend-web -> /workspace
    const hostRepoPath = `/opt/repositories/${task.repository}`; 

    try {
      // Check if container already exists
      execSync(`docker ps -a --format '{{.Names}}' | grep '^${containerName}$'`);
      console.log(`[Docker] Container ${containerName} exists. Waking it up...`);
      console.log(`[Docker] Executing: docker start ${containerName}`);
      
      // In a real system, you would execute the new task inside the running container:
      // execSync(`docker exec -d ${containerName} env TICKET_ID=${task.id} /start-task.sh`);
      
    } catch (e) {
      console.log(`[Orchestrator] Mounting strictly isolated repository: ${task.repository}`);
      console.log(`[Orchestrator] Injecting Git Attribution: ${gitAuthor}`);

      // Construct Docker Run Command
      // Removed --rm to keep the container shutdown until reactivated for future tickets
      const dockerArgs = [
        'run', '-d',
        '--name', containerName,
        '-v', `${hostRepoPath}:/workspace`,
        '-v', `${roleVectorPath}:/agent-config:ro`, // Mount role config as Read-Only
        '-v', `${roleVectorJsonPath}:/agent-context/role-vector.json`, // Role context vector
        '-v', `${featureVectorJsonPath}:/agent-context/feature-vector.json`, // Feature context vector
        '-e', `GIT_AUTHOR_NAME=${gitAuthor}`,
        '-e', `GIT_COMMITTER_NAME=${gitAuthor}`,
        '-e', `GIT_AUTHOR_EMAIL=${gitAuthor}@internal.system`,
        '-e', `GIT_COMMITTER_EMAIL=${gitAuthor}@internal.system`,
        '-e', `TICKET_ID=${task.id}`
      ];

      if (isProduction) {
        // In production, securely inject the API key from Vault/Secret Manager
        // NEVER written to disk.
        const apiKey = "secure-key-from-vault"; // Simulated fetch
        dockerArgs.push('-e', `LLM_API_KEY=${apiKey}`);
      } else {
        // Local Migration/PoC: Mount the local developer's CLI credentials
        dockerArgs.push('-v', `${process.env.HOME}/.config/gcloud:/root/.config/gcloud:ro`);
      }

      // Use a pre-built image name (e.g., high-integrity/api-key-container)
      dockerArgs.push(`high-integrity/${containerType}-container`);

      console.log(`[Docker] Executing: docker ${dockerArgs.join(' ')}`);
      
      // In a real scenario, we spawn the process and monitor it.
      // When the agent finishes its task, it shuts down, leaving the container ready to be started later.
    }
    
    this.activeContainers.set(task.id, 'running');
  }
}

// Example Execution
const orchestrator = new SandboxOrchestrator();

// Simulating an incoming webhook for a new ticket
orchestrator.handleTicketWebhook({
  id: 'TASK-1024',
  title: 'Update Button CSS',
  assignee: 'AI-FRONTEND-WEB-ENG',
  status: 'ToDo',
  repository: 'frontend-web'
});

module.exports = SandboxOrchestrator;
