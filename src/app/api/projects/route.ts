import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getWorkstations, upsertWorkstation, removeWorkstation, readConfig, type Workstation } from '@/lib/appConfig';
const { v4: uuidv4 } = require('uuid');
import path from 'path';
import fs from 'fs';
const Database = require('better-sqlite3');

// Map a config.yaml workstation to the shape the UI expects (legacy field names).
const toProject = (w: Workstation) => ({
  id: w.id,
  name: w.name,
  description: w.description || '',
  workspace_root: w.path,
  repo_path: w.repo_path || '',
  is_active: w.active ? 1 : 0,
});

export async function GET() {
  try {
    const projects = getWorkstations().map(toProject);
    return NextResponse.json({ success: true, projects });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, description, workspace_root, useExistingDir } = await request.json();

    // Guard: reject duplicate project names
    const existing = getWorkstations();
    const nameTaken = existing.find((w) => w.name.toLowerCase() === (name || '').toLowerCase());
    if (nameTaken) {
      return NextResponse.json(
        { success: false, error: `A project named "${nameTaken.name}" already exists. Choose a different name.` },
        { status: 409 }
      );
    }

    // Guard: reject if the workspace directory already exists on disk
    if (workspace_root && fs.existsSync(workspace_root)) {
      const dirOwner = existing.find((w) => w.path === workspace_root);
      if (dirOwner) {
        return NextResponse.json(
          { success: false, error: `Project "${dirOwner.name}" already uses the path ${workspace_root}. Choose a different name.` },
          { status: 409 }
        );
      }
      if (!useExistingDir) {
        return NextResponse.json(
          { success: false, error: `The directory ${workspace_root} already exists on disk.`, code: 'DIR_EXISTS' },
          { status: 409 }
        );
      }
      // useExistingDir=true: fall through and register the existing directory as-is
    }

    const id = `proj-${uuidv4().substring(0, 8)}`;

    // 1. Create Workspace Sub-folders (standardized hierarchy).
    //    'Workspaces' holds ephemeral, per-ticket scoped clones (see lib/workspace).
    const subfolders = ['Repository', 'Tickets', 'Logs', 'Config', 'Workspaces', 'Global', 'Domains', 'attachments'];
    subfolders.forEach(sub => {
        const fullPath = path.join(workspace_root, sub);
        if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
    });

    // Initialize Git repository inside the Repository folder
    try {
      const git = require('simple-git')(path.join(workspace_root, 'Repository'));
      await git.init();
      await git.raw(['-c', 'user.name=Gomaae', '-c', 'user.email=gomaae@local', 'commit', '--allow-empty', '-m', 'chore: init repository']);
    } catch (e) {
      console.error('[API Projects POST] Git initialization failed:', e);
    }

    // 2. Initialize Project Database
    const projectDbPath = path.join(workspace_root, 'Tickets', 'project.db');
    const projectDb = new Database(projectDbPath);
    projectDb.exec(`
        CREATE TABLE IF NOT EXISTS tickets (
            id TEXT PRIMARY KEY,
            external_id TEXT,
            identifier TEXT,
            title TEXT,
            description TEXT,
            status TEXT,
            agent_state TEXT,
            agent_phase TEXT,
            tier TEXT,
            parent_id TEXT,
            assigned_agent_id TEXT,
            document_name TEXT,
            document_type TEXT,
            document_content TEXT,
            document_path TEXT,
            start_datetime TEXT,
            due_datetime TEXT,
            vector_embedding BLOB,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            linked_ticket_id TEXT,
            blocked_by TEXT,
            authorized_model TEXT,
            llm_role TEXT,
            approx_runtime_minutes INTEGER,
            expected_token_usage INTEGER,
            actual_token_usage INTEGER,
            in_progress_at DATETIME,
            in_review_at DATETIME,
            review_approved_at DATETIME
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_external_id ON tickets(external_id) WHERE external_id IS NOT NULL;

        CREATE TABLE IF NOT EXISTS agent_roles (
            id TEXT PRIMARY KEY,
            name TEXT,
            description TEXT,
            personality_vector TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            name TEXT,
            role TEXT,
            llm_provider TEXT,
            container_id TEXT,
            status TEXT
        );

        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id TEXT,
            agent_id TEXT,
            log_line TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS project_settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );

        CREATE TABLE IF NOT EXISTS available_models (
            id TEXT PRIMARY KEY,
            provider_id TEXT,
            name TEXT,
            type TEXT,
            dry_run_status TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS service_accounts (
            id TEXT PRIMARY KEY,
            name TEXT,
            platform TEXT,
            iam_roles TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS comments (
            id TEXT PRIMARY KEY,
            ticket_id TEXT NOT NULL,
            author TEXT,
            body TEXT,
            attachments TEXT,
            source TEXT DEFAULT 'linear',
            created_at DATETIME,
            updated_at DATETIME
        );
        CREATE INDEX IF NOT EXISTS idx_comments_ticket ON comments(ticket_id);

        CREATE TABLE IF NOT EXISTS pillar_scores (
            pillar TEXT PRIMARY KEY,
            score INTEGER,
            feedback TEXT,
            content_hash TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 3. Register the workstation in the global config.yaml. When no workstation is
    //    active (first run, or after a deletion), the new one becomes active — otherwise
    //    AppShell's "no active workspace" guard immediately re-opens the creation modal.
    const hasActive = getWorkstations().some((w) => w.active);
    upsertWorkstation({ id, name, description: description || '', path: workspace_root, active: true });
    
    // 4. Seed workspace-scoped UI preferences from the current global defaults so the
    //    new workspace inherits whatever language/appearance the user last configured.
    const globalCfg = readConfig();
    const seedSettings = projectDb.prepare('INSERT OR REPLACE INTO project_settings (key, value) VALUES (?, ?)');
    seedSettings.run('language', globalCfg.language || 'English');
    seedSettings.run('appearance', globalCfg.appearance || 'system');

    // 5. Seed Default Roles in Project DB
    const roles = [
        { name: 'Technical Architect', description: 'Design core system architecture.' },
        { name: 'API Engineer', description: 'Implement backend services.' },
        { name: 'Frontend Web Eng', description: 'Craft UI components.' },
        { name: 'Functional QA Eng', description: 'Execute verification cycles.' },
        { name: 'Security Engineer', description: 'Enforce VFS security policies.' }
    ];
    
    const insertRole = projectDb.prepare('INSERT INTO agent_roles (id, name, description) VALUES (?, ?, ?)');
    roles.forEach(r => {
        const roleId = `role-${uuidv4().substring(0, 8)}`;
        insertRole.run(roleId, r.name, r.description);
    });

    projectDb.close();

    return NextResponse.json({ success: true, project: { id, name, description, workspace_root } });
  } catch (error: any) {
    console.error('[API Projects POST] Critical Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, name, description, workspace_root, repo_path } = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
    }

    upsertWorkstation({ id, name, description: description || '', path: workspace_root, repo_path: repo_path || undefined });

    return NextResponse.json({ success: true, project: { id, name, description, workspace_root, repo_path } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id, path: forcePath, deleteDirectory } = await request.json();

    // Path-only cleanup: delete an unregistered disk directory (used by e2e preconditions)
    if (!id && forcePath) {
      try { fs.rmSync(forcePath, { recursive: true, force: true }); } catch {}
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Project ID or path is required' }, { status: 400 });
    }

    // Capture the path before removing the registration
    const workstation = getWorkstations().find((w) => w.id === id);
    removeWorkstation(id);

    // Optional: delete the workspace directory (used by tests and explicit user-initiated cleanup)
    if (deleteDirectory && workstation?.path) {
      try {
        fs.rmSync(workstation.path, { recursive: true, force: true });
      } catch {
        // Non-fatal — registration is already gone; log but continue
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
