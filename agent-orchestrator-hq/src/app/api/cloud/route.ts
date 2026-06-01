import { NextResponse } from 'next/server';
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'ticket-manager.db');

export async function GET() {
  try {
    const db = new Database(dbPath);
    const accounts = db.prepare('SELECT * FROM service_accounts ORDER BY created_at DESC').all();
    return NextResponse.json({ success: true, accounts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, platform, iam_roles } = body;
    const db = new Database(dbPath);
    const id = `sa-${Math.random().toString(36).substr(2, 9)}`;
    
    db.prepare('INSERT INTO service_accounts (id, name, platform, iam_roles) VALUES (?, ?, ?, ?)')
      .run(id, name, platform, JSON.stringify(iam_roles || []));
    
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
