import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db, getActiveProjectId } = require('@/lib/db');
    const projectId = getActiveProjectId();
    
    if (!projectId) return NextResponse.json({ success: true, config: {} });

    const configRows = db.prepare('SELECT * FROM project_settings').all();
    const config: Record<string, string> = {};
    configRows.forEach((row: any) => {
      config[row.key] = row.value;
    });
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error('[API Config GET] Critical Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { db, getActiveProjectId } = require('@/lib/db');
    const projectId = getActiveProjectId();

    if (!projectId) {
       return NextResponse.json({ success: false, error: 'No active project' }, { status: 400 });
    }

    const body = await request.json();
    
    const upsert = db.prepare('INSERT OR REPLACE INTO project_settings (key, value) VALUES (?, ?)');
    
    const transaction = db.transaction((data: any) => {
      for (const [key, value] of Object.entries(data)) {
        upsert.run(key, value);
      }
    });
    
    transaction(body);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Config POST] Critical Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
