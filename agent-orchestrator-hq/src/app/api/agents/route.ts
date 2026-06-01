import { NextResponse } from 'next/server';
const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(process.cwd(), 'data', 'ticket-manager.db');

export async function GET() {
  try {
    const db = new Database(dbPath);
    const agents = db.prepare('SELECT * FROM agents').all();
    return NextResponse.json({ success: true, agents });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, role } = await request.json();
    const db = new Database(dbPath);
    
    const id = uuidv4();
    db.prepare('INSERT INTO agents (id, name, role, status) VALUES (?, ?, ?, ?)')
      .run(id, name, role, 'idle');
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const db = new Database(dbPath);
    
    db.prepare('DELETE FROM agents WHERE id = ?').run(id);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
