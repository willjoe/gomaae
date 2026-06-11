import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db, getActiveProjectId } from '@/lib/db';
import { readBrainstormGraph, readBrainstormSynthesis } from '@/lib/brainstorm';

/** Load the saved brainstorm graph + latest synthesis for the active workstation. */
export async function GET() {
  try {
    if (!getActiveProjectId()) return NextResponse.json({ success: true, nodes: [], edges: [], summary: '', pillars: {} });
    return NextResponse.json({ success: true, ...readBrainstormGraph(), ...readBrainstormSynthesis() });
  } catch (error: any) {
    console.error('[API Brainstorm GET] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/** Reset the brainstorm sandbox (clear graph + synthesis). */
export async function DELETE() {
  try {
    if (!getActiveProjectId()) return NextResponse.json({ success: false, error: 'No active workstation.' }, { status: 400 });
    db.exec('DELETE FROM brainstorm_nodes; DELETE FROM brainstorm_edges;');
    db.prepare("DELETE FROM project_settings WHERE key IN ('brainstorm_summary','brainstorm_pillars')").run();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Brainstorm DELETE] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
