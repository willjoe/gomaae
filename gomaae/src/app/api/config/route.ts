import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { readConfig, setGlobalSettings } from '@/lib/appConfig';

/**
 * Config API.
 *  - appearance + language are GLOBAL  -> config.yaml (via appConfig)
 *  - every other key is per-workstation -> active project's project_settings
 */
export async function GET() {
  try {
    const { db, getActiveProjectId } = require('@/lib/db');
    const config: Record<string, string> = {};

    // Per-workstation settings (only if a workstation is active).
    if (getActiveProjectId()) {
      try {
        const rows = db.prepare('SELECT * FROM project_settings').all();
        rows.forEach((row: any) => { config[row.key] = row.value; });
      } catch { /* project_settings may not exist for this workstation yet */ }
    }

    // Global UI prefs always win.
    const global = readConfig();
    config.appearance = global.appearance;
    config.language = global.language;

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error('[API Config GET] Critical Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { db, getActiveProjectId } = require('@/lib/db');
    const body = await request.json();
    const { appearance, language, ...rest } = body;

    // Global UI prefs -> config.yaml
    const globalPatch: { appearance?: string; language?: string } = {};
    if (appearance !== undefined) globalPatch.appearance = appearance;
    if (language !== undefined) globalPatch.language = language;
    if (Object.keys(globalPatch).length) setGlobalSettings(globalPatch as any);

    // Everything else -> active workstation's project_settings (lives in its path)
    if (Object.keys(rest).length) {
      if (!getActiveProjectId()) {
        return NextResponse.json({ success: false, error: 'No active workstation for per-workstation settings' }, { status: 400 });
      }
      const upsert = db.prepare('INSERT OR REPLACE INTO project_settings (key, value) VALUES (?, ?)');
      const transaction = db.transaction((data: any) => {
        for (const [key, value] of Object.entries(data)) upsert.run(key, value);
      });
      transaction(rest);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Config POST] Critical Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
