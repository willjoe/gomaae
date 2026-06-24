import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db, getActiveProjectId } from '@/lib/db';
import { generateText } from '@/lib/ai/llm';
import { parseJsonLoose } from '@/lib/brainstorm';

function genId() {
  return `fb-${Math.random().toString(36).slice(2, 10)}`;
}

function countTickets(): number {
  return (db.prepare('SELECT count(*) as c FROM tickets').get() as any)?.c || 0;
}

function insertTicket(opts: {
  tier: string; title: string; description: string;
  parent_id?: string | null; status?: string;
}) {
  const id = `tkt-${Math.random().toString(36).slice(2, 10)}`;
  const prefixes: Record<string, string> = { Operation: 'OPS', Story: 'TKT', Task: 'TKT', QA: 'QA' };
  const prefix = prefixes[opts.tier] || 'TKT';
  const identifier = `${prefix}-${1000 + countTickets()}`;
  db.prepare(`
    INSERT INTO tickets (id, identifier, title, description, status, tier, parent_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, identifier, opts.title, opts.description,
    opts.status || 'Backlog', opts.tier, opts.parent_id || null);
  return { id, identifier };
}

/** GET /api/release/feedback — list all posts newest-first */
export async function GET() {
  try {
    if (!getActiveProjectId()) return NextResponse.json({ success: true, posts: [] });
    const posts = db.prepare(
      'SELECT * FROM feedback_posts ORDER BY created_at DESC LIMIT 100'
    ).all();
    return NextResponse.json({ success: true, posts });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/release/feedback
 * Body: { type: 'bug' | 'feature', content: string, author?: string }
 *
 * bug     → Operation → Story → 2 Tasks (triage flow)
 * feature → Story under most-recent Backlog Epic (or standalone), no child tasks
 */
export async function POST(request: Request) {
  try {
    if (!getActiveProjectId()) {
      return NextResponse.json({ success: false, error: 'No active workstation.' }, { status: 400 });
    }

    const { type, content, author } = await request.json() as {
      type: 'bug' | 'feature'; content: string; author?: string;
    };

    if (!content?.trim()) {
      return NextResponse.json({ success: false, error: 'content is required.' }, { status: 400 });
    }
    if (type !== 'bug' && type !== 'feature') {
      return NextResponse.json({ success: false, error: 'type must be bug or feature.' }, { status: 400 });
    }

    const prompt = type === 'bug'
      ? `You are a Customer Success Manager converting a bug report into actionable tickets.

Bug report: """${content}"""
${author ? `Reporter: ${author}` : ''}

Return ONLY JSON:
{
  "opTitle": "<5-8 word bug summary>",
  "storyTitle": "<starts with Fix: — what to fix>",
  "storyDesc": "<user story: As a user, I want [fix] so that [benefit]. Bug context: [summary]>",
  "taskTitles": ["<reproduce & isolate the bug>", "<implement fix>"]
}`
      : `You are a Product Manager converting a feature request into a backlog story.

Feature request: """${content}"""
${author ? `Submitted by: ${author}` : ''}

Return ONLY JSON:
{
  "storyTitle": "<starts with a verb: Add/Improve/Build — what to build>",
  "storyDesc": "<user story: As a [user], I want [feature] so that [benefit]. Context: [summary]>"
}`;

    let parsed: any = {};
    try {
      parsed = parseJsonLoose(await generateText(prompt));
    } catch { /* use fallbacks */ }

    let ticketId = '';
    let ticketIdentifier = '';
    let ticketTier = '';

    if (type === 'bug') {
      const opTitle = parsed.opTitle || content.slice(0, 60);
      const storyTitle = parsed.storyTitle || `Fix: ${content.slice(0, 60)}`;
      const storyDesc = parsed.storyDesc || `Bug report:\n${content}`;
      const taskTitles: string[] = parsed.taskTitles || [
        'Reproduce and isolate the issue',
        'Implement fix and add regression test',
      ];

      const op = insertTicket({
        tier: 'Operation',
        title: opTitle,
        description: `Bug report${author ? ` from ${author}` : ''}:\n\n${content}`,
        status: 'Backlog',
      });
      const story = insertTicket({
        tier: 'Story', title: storyTitle, description: storyDesc,
        parent_id: op.id, status: 'Backlog',
      });
      for (const t of taskTitles) {
        insertTicket({
          tier: 'Task', title: t,
          description: `Task for bug fix ${story.identifier}.\n\nOriginal report:\n${content}`,
          parent_id: story.id, status: 'Backlog',
        });
      }

      ticketId = op.id;
      ticketIdentifier = op.identifier;
      ticketTier = 'Operation';
    } else {
      // Feature: find the most-recent Backlog Epic to parent under
      const backlogEpic = db.prepare(
        `SELECT id FROM tickets WHERE tier = 'Epic' AND status = 'Backlog' ORDER BY rowid DESC LIMIT 1`
      ).get() as any;

      const storyTitle = parsed.storyTitle || `Feature: ${content.slice(0, 60)}`;
      const storyDesc = parsed.storyDesc ||
        `Feature request${author ? ` from ${author}` : ''}:\n\n${content}`;

      const story = insertTicket({
        tier: 'Story', title: storyTitle, description: storyDesc,
        parent_id: backlogEpic?.id || null, status: 'Backlog',
      });

      ticketId = story.id;
      ticketIdentifier = story.identifier;
      ticketTier = 'Story';
    }

    // Persist the post
    const postId = genId();
    db.prepare(`
      INSERT INTO feedback_posts (id, type, content, author, ticket_id, ticket_identifier, ticket_tier)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(postId, type, content.trim(), author?.trim() || null,
      ticketId, ticketIdentifier, ticketTier);

    const post = db.prepare('SELECT * FROM feedback_posts WHERE id = ?').get(postId);
    return NextResponse.json({ success: true, post, ticketIdentifier, ticketTier });
  } catch (err: any) {
    console.error('[API release/feedback]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
