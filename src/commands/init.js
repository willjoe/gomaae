const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const chalk = require('chalk');

module.exports = async function initCommand() {
  const cwd = process.cwd();
  console.log(chalk.blue(`Initializing Agentic Engineering framework in ${cwd}...`));

  // Create .hiad hidden directory for metadata
  const hiadDir = path.join(cwd, '.hiad');
  if (!fs.existsSync(hiadDir)) {
    fs.mkdirSync(hiadDir, { recursive: true });
    console.log(chalk.green(`Created ${hiadDir}`));
  }

  // Set up DB
  const dbPath = path.join(hiadDir, 'ticket-manager.db');
  
  if (fs.existsSync(dbPath)) {
    console.log(chalk.yellow(`Database already exists at ${dbPath}. Skipping creation.`));
    return;
  }

  console.log(chalk.cyan(`Building High-Integrity SQLite Database...`));
  const db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS tickets (
          ticket_id TEXT PRIMARY KEY,
          subject TEXT,
          body_text TEXT,
          status TEXT,
          tier TEXT,
          parent_id TEXT,
          assigned_role TEXT,
          repository TEXT,
          created_at TEXT,
          updated_at TEXT,
          start_date TEXT,
          due_date TEXT,
          blocked_by TEXT,
          blocking TEXT,
          sync_status TEXT DEFAULT 'synced'
      )
    `);

    const now = new Date().toISOString().split('T')[0];
    const sampleStmt = db.prepare(`
      INSERT INTO tickets (ticket_id, subject, body_text, status, tier, parent_id, assigned_role, repository, created_at, updated_at, start_date, due_date, blocked_by, blocking, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sampleData = [
      ['EPC-1000', 'Phase 2: CI/CD & Verification Loop Implementation', 'Implement GitOps and PR validation policies across all repositories.', 'In Progress', 'Epic', null, 'AI-DEVOPS-ENGINEER', path.basename(cwd), now, now, now, '2026-06-15', null, null, 'synced'],
      ['STR-1001', 'Set up build pipelines', 'Create standard CI/CD pipelines.', 'ToDo', 'Story', 'EPC-1000', 'AI-DEVOPS-ENGINEER', path.basename(cwd), now, now, now, '2026-05-30', null, null, 'synced']
    ];

    for (const row of sampleData) {
      sampleStmt.run(row);
    }
    sampleStmt.finalize();
  });

  db.close((err) => {
    if (err) {
      console.error(chalk.red(`Failed to initialize database: ${err.message}`));
    } else {
      console.log(chalk.green(`✅ Successfully generated HIAD SQLite Ticket Database at ${dbPath}`));
      console.log(chalk.blue(`\nYou can now run 'hiad ui' to manage your tickets.`));
    }
  });
};
