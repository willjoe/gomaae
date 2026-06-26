import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

const WORKER_URL = 'https://gomaae-feedback.gomaae.workers.dev';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { type = 'bug', title, description } = body;

    if (!description?.trim()) {
      return NextResponse.json({ success: false, error: 'Description is required.' }, { status: 400 });
    }

    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, title, description }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (err: any) {
    console.error('[API feedback]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
