import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

const FEEDBACK_OWNER = 'willjoe';
const FEEDBACK_REPO  = 'gomaae';
const REST = 'https://api.github.com';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { type = 'bug', title, description } = body;

    const token = process.env.GOMAAE_FEEDBACK_TOKEN;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Feedback submissions are not enabled on this build.' },
        { status: 503 },
      );
    }

    if (!description?.trim()) {
      return NextResponse.json({ success: false, error: 'Description is required.' }, { status: 400 });
    }

    const isFeature = type === 'feature';
    const prefix    = isFeature ? 'Feature' : 'Bug';
    const ghTitle   = title?.trim()
      ? `[${prefix}] ${title.trim()}`
      : `[${prefix}] ${description.trim().slice(0, 72)}`;

    const labels = ['user-feedback', isFeature ? 'enhancement' : 'bug'];

    const ghBody = [
      description.trim(),
      '',
      '---',
      `**Type:** ${isFeature ? 'Feature Request' : 'Bug Report'}`,
      `**Source:** Submitted via gomaae`,
    ].join('\n');

    // Ensure labels exist (first call may create them; 422 = already exists, safe to ignore).
    const labelDefs = [
      { name: 'user-feedback', color: '0075ca', description: 'Submitted by a gomaae user' },
      { name: 'bug',           color: 'd73a4a', description: 'Something is broken' },
      { name: 'enhancement',   color: 'a2eeef', description: 'New feature or improvement' },
    ];
    await Promise.all(labelDefs.map(l =>
      fetch(`${REST}/repos/${FEEDBACK_OWNER}/${FEEDBACK_REPO}/labels`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify(l),
      }).catch(() => { /* ignore — already exists */ })
    ));

    const res = await fetch(`${REST}/repos/${FEEDBACK_OWNER}/${FEEDBACK_REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ title: ghTitle, body: ghBody, labels }),
    });

    const data = await res.json();

    if (!data.number) {
      return NextResponse.json(
        { success: false, error: data.message || 'GitHub rejected the submission.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, issueNumber: data.number });
  } catch (err: any) {
    console.error('[API feedback]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
