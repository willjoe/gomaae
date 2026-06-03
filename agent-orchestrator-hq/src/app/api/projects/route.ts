import { NextResponse } from "next/server";
export const dynamic = "force-static";
import { db } from '@/lib/db';
const { v4: uuidv4 } = require('uuid');

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
    const { name, description, repo_path, docs_path } = await request.json();
    const id = `proj-${uuidv4().substring(0, 8)}`;
    
    // 1. Create Project
    db.prepare('INSERT INTO projects (id, name, description, repo_path, docs_path, is_active) VALUES (?, ?, ?, ?, ?, ?)').run(id, name, description, repo_path, docs_path, 0);
    
    // 2. Seed Default Roles for this project
    const roles = [
        { name: 'Technical Architect', description: 'Design core system architecture and technical mandates.' },
        { name: 'API Engineer', description: 'Implement high-integrity backend services and GraphQL schemas.' },
        { name: 'Frontend Web Eng', description: 'Craft responsive, accessible UI components with Tailwind v4.' },
        { name: 'Functional QA Eng', description: 'Execute deterministic verification cycles and SRT simulations.' },
        { name: 'Security Engineer', description: 'Enforce VFS security policies and mutation authorization.' }
    ];
    
    const insertRole = db.prepare('INSERT INTO agent_roles (id, name, description, project_id) VALUES (?, ?, ?, ?)');
    roles.forEach(r => {
        const roleId = `role-${uuidv4().substring(0, 8)}`;
        insertRole.run(roleId, r.name, r.description, id);
    });

    return NextResponse.json({ success: true, project: { id, name, description, repo_path, docs_path } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, name, description, repo_path, docs_path } = await request.json();
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
    }

    db.prepare('UPDATE projects SET name = ?, description = ?, repo_path = ?, docs_path = ? WHERE id = ?')
      .run(name, description, repo_path, docs_path, id);
      
    return NextResponse.json({ success: true, project: { id, name, description, repo_path, docs_path } });
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

    // 1. Delete tickets associated with this project (if any specific mapping exists, 
    // for now we assume tickets are shared or managed via the project's own DB if we had multiple DBs.
    // Since we unified to one DB, we might want to tag tickets by project_id in the future.
    // For now, just delete the project record.
    
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
      
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
