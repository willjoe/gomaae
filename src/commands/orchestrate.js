const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

module.exports = function orchestrateCommand() {
  const cwd = process.cwd();
  console.log(chalk.blue(`[Orchestrator] Starting Agentic Orchestrator daemon in ${cwd}...`));

  const hiadDir = path.join(cwd, '.hiad');
  if (!fs.existsSync(hiadDir)) {
    console.log(chalk.red(`No .hiad config found. Please run 'hiad init' first.`));
    process.exit(1);
  }

  // Instead of a persistent daemon for this mockup, we'll demonstrate waking the container 
  // based on the top ToDo task from the DB.
  
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(hiadDir, 'ticket-manager.db');
  const db = new sqlite3.Database(dbPath);

  db.get(`SELECT * FROM tickets WHERE status = 'ToDo' LIMIT 1`, (err, row) => {
    if (err || !row) {
      console.log(chalk.yellow(`[Orchestrator] No tasks in 'ToDo' state found. Idling...`));
      db.close();
      return;
    }

    console.log(chalk.green(`[Orchestrator] Found task ${row.ticket_id}: ${row.subject}`));
    
    // Simulate what the orchestrator does
    const task = row;
    const folderName = (task.assigned_role || 'default').replace('AI-', '').toLowerCase();
    const repoName = task.repository || path.basename(cwd);
    const containerName = `agent-${folderName}-${repoName}`;
    
    console.log(chalk.cyan(`[Orchestrator] Provisioning/Waking container ${containerName} for task ${task.ticket_id}...`));

    // Vector Context Paths local to the user's project
    const roleVectorDir = path.join(hiadDir, 'roles', folderName);
    if (!fs.existsSync(roleVectorDir)) fs.mkdirSync(roleVectorDir, { recursive: true });

    const roleVectorJsonPath = path.join(roleVectorDir, 'vector.json');
    if (!fs.existsSync(roleVectorJsonPath)) {
      fs.writeFileSync(roleVectorJsonPath, JSON.stringify({ role_knowledge: [] }, null, 2));
    }
    
    const featureVectorDir = path.join(hiadDir, 'features', repoName);
    if (!fs.existsSync(featureVectorDir)) fs.mkdirSync(featureVectorDir, { recursive: true });
    
    const featureVectorJsonPath = path.join(featureVectorDir, 'vector.json');
    if (!fs.existsSync(featureVectorJsonPath)) {
      fs.writeFileSync(featureVectorJsonPath, JSON.stringify({ feature_context: {} }, null, 2));
    }

    try {
      console.log(`[Docker] Checking if container ${containerName} exists...`);
      execSync(`docker ps -a --format '{{.Names}}' | grep '^${containerName}$'`);
      console.log(`[Docker] Container ${containerName} exists. Waking it up...`);
      // execSync(`docker start ${containerName}`);
      console.log(chalk.green(`[Docker] Simulated 'docker start ${containerName}'`));
      
    } catch (e) {
      console.log(`[Docker] Container doesn't exist. Creating new container...`);
      
      const dockerArgs = [
        'run', '-d',
        '--name', containerName,
        '-v', `${cwd}:/workspace`,
        '-v', `${roleVectorJsonPath}:/agent-context/role-vector.json`,
        '-v', `${featureVectorJsonPath}:/agent-context/feature-vector.json`,
        '-e', `TICKET_ID=${task.ticket_id}`
      ];

      // Use a pre-built placeholder image
      dockerArgs.push(`high-integrity/cli-login-container`);

      console.log(chalk.gray(`[Docker] Executing: docker ${dockerArgs.join(' ')}`));
      // In reality, this would execute the spawn command. We log it here for the package.
      console.log(chalk.green(`[Docker] Simulated container creation.`));
    }

    db.close();
  });
};
