/**
 * High-Integrity Agent Worker Entrypoint
 * This script runs inside the sandboxed Docker container.
 * Enforces branch isolation and atomic edits on a volume-mounted repository.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ticketId = process.env.TICKET_ID;
const ticketIdent = process.env.TICKET_IDENTIFIER;
const agentRole = process.env.AGENT_ROLE;
const targetBranch = process.env.GIT_BRANCH;
const workspace = '/app/workspace'; // Mounted via bind-mount by orchestrator

console.log(`[Worker] Starting Agent: ${agentRole} for Ticket: ${ticketIdent}`);
console.log(`[Worker] Workspace: ${workspace}`);
console.log(`[Worker] Target Branch: ${targetBranch}`);

try {
  process.chdir(workspace);

  // 1. Enforce Branch Isolation
  console.log(`[Worker] Initializing isolation on branch: ${targetBranch}...`);
  try {
    // Check if branch exists, if not create it from current HEAD
    execSync(`git rev-parse --verify ${targetBranch}`, { stdio: 'ignore' });
    execSync(`git checkout ${targetBranch}`);
  } catch (e) {
    execSync(`git checkout -b ${targetBranch}`);
  }

  // 2. Mock Agent Reasoning & Code Generation
  console.log(`[Worker] Analyzing mounted registry context...`);
  
  // Simulation: Wait for LLM reasoning
  setTimeout(() => {
    console.log('[Worker] Identifying atomic change scope...');
    
    // Perform an "Atomic Edit" (Appends to a project-specific log)
    const logPath = path.join(workspace, 'automation_registry.log');
    const entry = `[${new Date().toISOString()}] Ticket: ${ticketIdent} | Role: ${agentRole} | Branch: ${targetBranch}\n`;
    fs.appendFileSync(logPath, entry);
    
    console.log('[Worker] Changes applied to volume. Committing to isolated branch...');
    
    // 3. Commit with High-Integrity Attribution
    try {
      execSync(`git config user.name "AI Agent (${agentRole})"`);
      execSync(`git config user.email "agent@internal.system"`);
      execSync(`git add .`);
      execSync(`git commit -m "feat(${ticketIdent}): autonomous implementation update"`);
      console.log(`[Worker] Changes committed successfully to ${targetBranch}.`);
    } catch (commitErr) {
      console.log('[Worker] No changes detected or commit failed. Maintaining integrity.');
    }

    console.log('[Worker] Task complete. Signal: SUCCESS');
    process.exit(0);
  }, 3000);

} catch (err) {
  console.error('[Worker] Fatal Orchestration Failure:', err.message);
  process.exit(1);
}
