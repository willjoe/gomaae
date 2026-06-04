import { NextResponse } from "next/server";
export const dynamic = "force-static";

export async function GET() {
  try {
    const { db } = require('@/lib/db');
    const agents = db.prepare('SELECT * FROM agents').all();
    return NextResponse.json({ success: true, agents });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, role } = await request.json();
    const { db } = require('@/lib/db');
    const { v4: uuidv4 } = require('uuid');
    
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
    const { db } = require('@/lib/db');
    
    db.prepare('DELETE FROM agents WHERE id = ?').run(id);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
