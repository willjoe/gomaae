#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

const program = new Command();

program
  .name('hiad')
  .description('High-Integrity Identity Bridge')
  .version('0.1.0');

/**
 * MOCK: Retrieve ticket metadata
 * In a real implementation, this would call the Linear/Jira API
 */
function getMockTicket(taskId) {
  const mockTickets = {
    'TASK-123': {
      id: 'TASK-123',
      title: 'Implement camera rotation logic',
      status: 'ToDo',
      ai_opt_in: true,
      model: 'qwen-2.5-32b',
      allow_write: ['src/rec/camera/']
    },
    'TASK-456': {
      id: 'TASK-456',
      title: 'Audit security keys',
      status: 'ToDo',
      ai_opt_in: false,
      model: 'gemini-1.5-pro',
      allow_write: ['infra/keys/']
    }
  };
  return mockTickets[taskId] || null;
}

program
  .command('start')
  .argument('<taskId>', 'The ID of the ticket to start')
  .description('Activate a JIT session and bridge the local environment')
  .action(async (taskId) => {
    console.log(chalk.blue(`\n🚀 Initializing High-Integrity Bridge for ${taskId}...`));

    const ticket = getMockTicket(taskId);
    if (!ticket) {
      console.error(chalk.red(`Error: Ticket ${taskId} not found.`));
      process.exit(1);
    }

    // 1. Verify Trigger Logic
    if (ticket.status === 'Backlog') {
      console.log(chalk.yellow(`Status is 'Backlog'. Moving to 'ToDo' to trigger JIT...`));
      ticket.status = 'ToDo';
    }

    console.log(chalk.cyan(`Provisioning JIT Environment (Backlog -> ToDo)...`));
    
    // Simulate JIT Delay
    setTimeout(() => {
      console.log(chalk.green(`✅ JIT Environment Ready. Status: In Progress.`));
      
      // 2. Mount VFS (Simulation)
      console.log(chalk.blue(`🔗 Mounting Virtual File System to /tmp/hiad-vfs/${taskId}`));
      ticket.allow_write.forEach(p => console.log(`   - Authorized: ${p}`));

      // 3. Configure AI Assistant
      if (ticket.ai_opt_in) {
        console.log(chalk.blue(`🤖 AI Opt-In: ACTIVE. Autonomous Execution delegated to: ${ticket.model}`));
      } else {
        console.log(chalk.cyan(`👤 Human-Driven Mode. Configuring Local Assistant: ${ticket.model}`));
      }

      // 4. Persistence
      const stateDir = path.join(process.cwd(), '.agent_state');
      if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir);
      
      const metadataPath = path.join(stateDir, `${taskId}.json`);
      fs.writeFileSync(metadataPath, JSON.stringify(ticket, null, 2));
      
      console.log(chalk.green(`\n✅ Bridge Active. You can now begin work in the VFS mount.`));
      console.log(`State persisted to ${metadataPath}`);
    }, 1000);
  });

program
  .command('status')
  .description('Check current bridge status')
  .action(() => {
    const stateDir = path.join(process.cwd(), '.agent_state');
    if (!fs.existsSync(stateDir)) {
      console.log("No active High-Integrity bridge found.");
      return;
    }
    const files = fs.readdirSync(stateDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) {
      console.log("No active High-Integrity bridge found.");
    } else {
      console.log(chalk.blue("Active JIT Sessions:"));
      files.forEach(f => console.log(` - ${f.replace('.json', '')}`));
    }
  });

program.parse();
