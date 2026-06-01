/**
 * Agent Worker Entrypoint
 * This script runs inside the Docker worker container.
 * It initializes the environment, pulls the latest code, 
 * and executes the LLM-driven task.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ticketId = process.env.TICKET_ID;
const agentRole = process.env.AGENT_ROLE;
const llmProvider = process.env.LLM_PROVIDER;

console.log(`[Worker] Starting Agent: ${agentRole} for Ticket: ${ticketId}`);
console.log(`[Worker] LLM Provider: ${llmProvider}`);

// 1. Setup workspace
const workspace = '/app';
process.chdir(workspace);

try {
  // 2. Initialize Git if not already
  if (!fs.existsSync(path.join(workspace, '.git'))) {
    console.log('[Worker] No git repo found. Initializing...');
    // In a real scenario, the orchestrator mounts the repo, but we ensure it's ready.
  }

  // 3. Simulate Agent Execution
  console.log(`[Worker] Analyzing codebase for ticket ${ticketId}...`);
  
  // Mocking the agent thinking and writing files
  setTimeout(() => {
    console.log('[Worker] Identifying necessary changes in src/...');
    
    const mockChange = `// Changes for ${ticketId}\n// Role: ${agentRole}\nconsole.log("Agentic fix applied");\n`;
    fs.appendFileSync(path.join(workspace, 'agent_log.txt'), mockChange);
    
    console.log('[Worker] Writing changes to workspace...');
    
    // 4. Commit changes
    try {
      execSync(`git config user.name "Autonomous AI Agent"`);
      execSync(`git config user.email "agent@internal.system"`);
      // execSync(`git add . && git commit -m "fix(${ticketId}): apply autonomous changes"`);
      console.log('[Worker] Changes committed (simulated).');
    } catch (e) {
      console.log('[Worker] Git commit failed (might be no changes or no git config).');
    }

    console.log('[Worker] Task complete. Signalling orchestrator...');
    process.exit(0);
  }, 5000);

} catch (err) {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
}
