import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { readConfig, setGlobalSettings } from '@/lib/appConfig';

/**
 * Config API.
 *  - appearance + language are PER-WORKSPACE -> active project's project_settings
 *    (config.yaml holds global fallback defaults for when no workspace is active)
 *  - every other key is per-workstation -> active project's project_settings
 */
export async function GET() {
  try {
    const { db, getActiveProjectId } = require('@/lib/db');
    const globalCfg = readConfig();
    const config: Record<string, string> = {
      // Start with global fallbacks so the app always has values even with no workspace.
      appearance: globalCfg.appearance,
      language: globalCfg.language,
    };

    // Per-workstation settings override global defaults when a workspace is active.
    if (getActiveProjectId()) {
      try {
        const rows = db.prepare('SELECT * FROM project_settings').all();
        rows.forEach((row: any) => { config[row.key] = row.value; });
      } catch { /* project_settings may not exist for this workstation yet */ }
    }

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

    const projectId = getActiveProjectId();
    const upsert = projectId
      ? db.prepare('INSERT OR REPLACE INTO project_settings (key, value) VALUES (?, ?)')
      : null;

    if (projectId) {
      // Workspace is active: appearance + language are workspace-scoped.
      const wsSettings: Record<string, string> = { ...rest };
      if (appearance !== undefined) wsSettings.appearance = appearance;
      if (language !== undefined) wsSettings.language = language;
      if (Object.keys(wsSettings).length) {
        db.transaction((data: any) => {
          for (const [key, value] of Object.entries(data)) upsert!.run(key, value);
        })(wsSettings);
      }
    } else {
      // No active workspace: persist appearance + language as global fallback defaults.
      const globalPatch: { appearance?: string; language?: string } = {};
      if (appearance !== undefined) globalPatch.appearance = appearance;
      if (language !== undefined) globalPatch.language = language;
      if (Object.keys(globalPatch).length) setGlobalSettings(globalPatch as any);

      // Non-appearance/language keys require a workspace — reject.
      if (Object.keys(rest).length) {
        return NextResponse.json({ success: false, error: 'No active workstation for per-workstation settings' }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Config POST] Critical Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
