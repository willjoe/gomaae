import { NextResponse } from 'next/server';
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'ticket-manager.db');

export async function GET() {
  try {
    const db = new Database(dbPath);
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const config = rows.reduce((acc: any, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = new Database(dbPath);
    
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    
    const transaction = db.transaction((settings: any) => {
      for (const [key, value] of Object.entries(settings)) {
        upsert.run(key, value);
      }
    });
    
    transaction(body);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
