import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
const { v4: uuidv4 } = require('uuid');

export async function GET() {
  try {
    const { getActiveProjectId } = require('@/lib/db');
    const projectId = getActiveProjectId();
    
    if (!projectId) return NextResponse.json({ success: true, roles: [] });

    const roles = db.prepare('SELECT * FROM agent_roles WHERE project_id = ? ORDER BY created_at DESC').all(projectId);
    return NextResponse.json({ success: true, roles });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { getActiveProjectId } = require('@/lib/db');
    const projectId = getActiveProjectId();

    if (!projectId) {
       return NextResponse.json({ success: false, error: 'No active project' }, { status: 400 });
    }

    const { name, description } = await request.json();
    const id = `role-${uuidv4().substring(0, 8)}`;
    
    db.prepare('INSERT INTO agent_roles (id, name, description, project_id) VALUES (?, ?, ?, ?)')
      .run(id, name, description, projectId);
    
    return NextResponse.json({ success: true, role: { id, name, description, project_id: projectId } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
