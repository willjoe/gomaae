import { NextResponse } from "next/server";
export const dynamic = "force-static";
import { systemDb as db } from '@/lib/db';
const { v4: uuidv4 } = require('uuid');
import path from 'path';
import fs from 'fs';
const Database = require('better-sqlite3');

export async function GET() {
  try {
    const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
    return NextResponse.json({ success: true, projects });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, description, workspace_root } = await request.json();
    const id = `proj-${uuidv4().substring(0, 8)}`;
    
    // 1. Create Workspace Sub-folders
    const subfolders = ['Repository', 'DocsAssets', 'Tickets', 'Logs', 'Config'];
    subfolders.forEach(sub => {
        const fullPath = path.join(workspace_root, sub);
        if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
    });

    // 2. Initialize Project Database
    const projectDbPath = path.join(workspace_root, 'Tickets', 'project.db');
    const projectDb = new Database(projectDbPath);
    projectDb.exec(`
        CREATE TABLE IF NOT EXISTS tickets (
            id TEXT PRIMARY KEY,
            identifier TEXT,
            title TEXT,
            description TEXT,
            status TEXT,
            tier TEXT,
            parent_id TEXT,
            assigned_agent_id TEXT,
            document_name TEXT,
            document_type TEXT,
            document_content TEXT,
            document_path TEXT,
            start_date TEXT,
            due_date TEXT,
            vector_embedding BLOB,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            linked_ticket_id TEXT
        );

        CREATE TABLE IF NOT EXISTS agent_roles (
            id TEXT PRIMARY KEY,
            name TEXT,
            description TEXT,
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
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 3. Register Project in System DB
    db.prepare('INSERT INTO projects (id, name, description, workspace_root, is_active) VALUES (?, ?, ?, ?, ?)').run(id, name, description, workspace_root, 0);
    
    // 4. Seed Default Roles in Project DB
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
    const { id, name, description, workspace_root } = await request.json();
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
    }

    db.prepare('UPDATE projects SET name = ?, description = ?, workspace_root = ? WHERE id = ?')
      .run(name, description, workspace_root, id);
      
    return NextResponse.json({ success: true, project: { id, name, description, workspace_root } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
      
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
