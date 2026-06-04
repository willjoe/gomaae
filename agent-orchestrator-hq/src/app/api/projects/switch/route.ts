import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();
    
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
