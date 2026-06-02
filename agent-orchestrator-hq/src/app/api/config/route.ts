import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const configRows = db.prepare('SELECT * FROM settings').all();
    const config: Record<string, string> = {};
    configRows.forEach((row: any) => {
      config[row.key] = row.value;
    });
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    
    const transaction = db.transaction((data: any) => {
      for (const [key, value] of Object.entries(data)) {
        upsert.run(key, value);
      }
    });
    
    transaction(body);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
