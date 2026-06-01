import { simpleGit, SimpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs';
import { db } from './db';

const REPOS_ROOT = process.env.REPOS_DIR || path.join(process.cwd(), 'repos');

if (!fs.existsSync(REPOS_ROOT)) {
  fs.mkdirSync(REPOS_ROOT, { recursive: true });
}

export class GitService {
  private git: SimpleGit;

  constructor(repoPath: string) {
    this.git = simpleGit(repoPath);
  }

  static async setupBranchForTicket(ticketId: string) {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId) as any;
    
    if (!ticket) throw new Error('Ticket not found');
    if (ticket.branch_name) {
      console.log(`Branch already exists for ticket ${ticket.identifier}: ${ticket.branch_name}`);
      return ticket.branch_name;
    }

    // 1. Determine Repository (assuming monorepo for now or parsing from ticket)
    // For this project, we might want to target specific sub-folders or sub-repos.
    // Defaulting to the project's own repository URL if available, or a placeholder.
    const repoUrl = ticket.repo_url || 'https://github.com/AgenticEngineering/core-app.git'; // Example default
    const repoName = path.basename(repoUrl, '.git');
    const repoPath = path.join(REPOS_ROOT, repoName);

    // 2. Clone if not exists
    if (!fs.existsSync(repoPath)) {
      console.log(`Cloning repository ${repoUrl}...`);
      await simpleGit().clone(repoUrl, repoPath);
    }

    const git = simpleGit(repoPath);

    // 3. Create branch name
    const slug = ticket.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30);
    const branchName = `task/${ticket.identifier}-${slug}`;

    console.log(`Creating branch ${branchName} in ${repoName}...`);
    
    // Ensure we are on main/master and up to date
    await git.checkout('main').catch(() => git.checkout('master'));
    await git.pull();
    
    // Create feature branch
    await git.checkoutLocalBranch(branchName);

    // 4. Update SQLite
    db.prepare('UPDATE tickets SET branch_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(branchName, ticketId);

    console.log(`Branch ${branchName} successfully assigned to ticket ${ticket.identifier}`);
    return branchName;
  }
}
