import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db, getActiveProjectId } from '@/lib/db';

const KEYS = [
  'github_projects_api_key',
  'github_projects_owner',
  'github_projects_repo',
  'github_projects_number',
  'github_projects_project_node_id',
  'github_projects_user_name',
  'github_projects_team_name',
];

export async function DELETE() {
  try {
    if (!getActiveProjectId()) {
      return NextResponse.json({ success: false, error: 'No active workspace.' }, { status: 400 });
    }
    const del = db.prepare('DELETE FROM project_settings WHERE key = ?');
    for (const key of KEYS) del.run(key);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
