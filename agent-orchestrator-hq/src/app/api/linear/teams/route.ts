import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db, getActiveProjectId } from '@/lib/db';

const LINEAR_API_URL = "https://api.linear.app/graphql";

function storedLinearKey(): string | null {
  try {
    if (!getActiveProjectId()) return null;
    const row = db.prepare('SELECT value FROM project_settings WHERE key = ?').get('linear_api_key') as any;
    return row?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Detect the Linear teams reachable with a given API key, so the user can pick
 * which team's tickets sync to this workspace. Accepts an `apiKey` in the body
 * (used before the key is saved); otherwise falls back to the stored key.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    let apiKey: string | null = body?.apiKey || null;
    if (!apiKey || apiKey === 'oauth_managed_token' || apiKey === 'cli_managed_proxy') {
      apiKey = storedLinearKey();
    }
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'No Linear API key provided.' }, { status: 400 });
    }

    const res = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': apiKey },
      body: JSON.stringify({ query: '{ teams { nodes { id name key } } }' }),
    });
    const data = await res.json();

    if (data.errors) {
      const message = data.errors[0]?.message || 'Linear rejected the request (check the API key).';
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const teams = (data.data?.teams?.nodes || []).map((t: any) => ({ id: t.id, name: t.name, key: t.key }));
    return NextResponse.json({ success: true, teams });
  } catch (error: any) {
    console.error('[API Linear Teams] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
