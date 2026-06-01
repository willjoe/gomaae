import { NextResponse } from 'next/server';
const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(process.cwd(), 'data', 'ticket-manager.db');

export async function GET() {
  try {
    const db = new Database(dbPath);
    const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
    return NextResponse.json({ success: true, projects });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, description } = await request.json();
    const db = new Database(dbPath);
    
    const id = `proj-${uuidv4().substring(0, 8)}`;
    db.prepare('INSERT INTO projects (id, name, description, is_active) VALUES (?, ?, ?, ?)')
      .run(id, name, description, 0);
    
    return NextResponse.json({ success: true, project: { id, name, description } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
