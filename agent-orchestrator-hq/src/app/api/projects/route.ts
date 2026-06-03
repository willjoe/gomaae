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
    
    db.prepare('INSERT INTO projects (id, name, description, repo_path, docs_path, is_active) VALUES (?, ?, ?, ?, ?, ?)').run(id, name, description, repo_path, docs_path, 0);
    
    return NextResponse.json({ success: true, project: { id, name, description, repo_path, docs_path } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
