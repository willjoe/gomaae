import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db, getActiveProjectId } from '@/lib/db';

const GQL = 'https://api.github.com/graphql';

function storedToken(): string | null {
  try {
    if (!getActiveProjectId()) return null;
    return (db.prepare('SELECT value FROM project_settings WHERE key = ?').get('github_projects_api_key') as any)?.value ?? null;
  } catch { return null; }
}

async function gql(token: string, query: string) {
  const res = await fetch(GQL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

/**
 * Validate a GitHub PAT and return the user identity + all Projects v2 the
 * token can access (personal projects + org projects for every org membership).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = body?.token || storedToken();
    if (!token) {
      return NextResponse.json({ success: false, error: 'No GitHub token provided.' }, { status: 400 });
    }

    const data = await gql(token, `{
      viewer {
        login name
        projectsV2(first: 20) {
          nodes { number title url }
        }
        organizations(first: 10) {
          nodes {
            login
            projectsV2(first: 20) {
              nodes { number title url }
            }
          }
        }
      }
    }`);

    if (data.errors) {
      return NextResponse.json({ success: false, error: data.errors[0]?.message || 'GitHub API error.' }, { status: 400 });
    }

    const viewer = data.data?.viewer;
    if (!viewer) {
      return NextResponse.json({ success: false, error: 'Invalid token — could not reach GitHub.' }, { status: 401 });
    }

    const projects: { number: number; title: string; owner: string; url: string }[] = [];

    for (const p of viewer.projectsV2?.nodes ?? []) {
      projects.push({ number: p.number, title: p.title, owner: viewer.login, url: p.url });
    }
    for (const org of viewer.organizations?.nodes ?? []) {
      for (const p of org.projectsV2?.nodes ?? []) {
        projects.push({ number: p.number, title: p.title, owner: org.login, url: p.url });
      }
    }

    return NextResponse.json({
      success: true,
      user: viewer.name || viewer.login,
      login: viewer.login,
      projects,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
