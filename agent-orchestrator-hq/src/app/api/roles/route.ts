import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
const { v4: uuidv4 } = require('uuid');

export async function GET() {
  try {
    const roles = db.prepare('SELECT * FROM agent_roles ORDER BY created_at DESC').all();
    return NextResponse.json({ success: true, roles });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, description } = await request.json();
    const id = `role-${uuidv4().substring(0, 8)}`;
    
    db.prepare('INSERT INTO agent_roles (id, name, description) VALUES (?, ?, ?)')
      .run(id, name, description);
    
    return NextResponse.json({ success: true, role: { id, name, description } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
