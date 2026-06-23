import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
const { v4: uuidv4 } = require('uuid');

export async function GET() {
  try {
    const { getActiveProjectId } = require('@/lib/db');
    const projectId = getActiveProjectId();
    
    if (!projectId) return NextResponse.json({ success: true, roles: [] });

    const roles = db.prepare('SELECT * FROM agent_roles ORDER BY created_at DESC').all();
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

    const { name, description, personality_vector } = await request.json();
    const id = `role-${uuidv4().substring(0, 8)}`;

    db.prepare('INSERT INTO agent_roles (id, name, description, personality_vector) VALUES (?, ?, ?, ?)')
      .run(id, name, description, personality_vector || null);

    return NextResponse.json({ success: true, role: { id, name, description, personality_vector } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, name, description, personality_vector } = await request.json();
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    const sets: string[] = [];
    const vals: any[] = [];
    if (name !== undefined) { sets.push('name = ?'); vals.push(name); }
    if (description !== undefined) { sets.push('description = ?'); vals.push(description); }
    if (personality_vector !== undefined) { sets.push('personality_vector = ?'); vals.push(personality_vector || null); }
    if (!sets.length) return NextResponse.json({ success: true });
    db.prepare(`UPDATE agent_roles SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
