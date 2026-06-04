import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db } = require('@/lib/db');
    const accounts = db.prepare('SELECT * FROM service_accounts ORDER BY created_at DESC').all();
    return NextResponse.json({ success: true, accounts });
  } catch (error: any) {
    console.error('[API Cloud GET] Critical Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { db } = require('@/lib/db');
    const body = await request.json();
    const { name, platform, iam_roles } = body;
    const id = `sa-${Math.random().toString(36).substr(2, 9)}`;
    
    db.prepare('INSERT INTO service_accounts (id, name, platform, iam_roles) VALUES (?, ?, ?, ?)')
      .run(id, name, platform, JSON.stringify(iam_roles || []));
    
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('[API Cloud POST] Critical Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
