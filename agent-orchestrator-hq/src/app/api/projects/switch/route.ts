import { NextResponse } from 'next/server';
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'ticket-manager.db');

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();
    const db = new Database(dbPath);
    
    // Use a transaction to ensure atomic project switching
    const switchProject = db.transaction(() => {
      db.prepare('UPDATE projects SET is_active = 0').run();
      db.prepare('UPDATE projects SET is_active = 1 WHERE id = ?').run(projectId);
    });
    
    switchProject();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
