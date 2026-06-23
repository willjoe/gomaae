import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import crypto from 'crypto';
import { db, getActiveProjectId } from '@/lib/db';
import { ingestLinearComment, removeLinearComment } from '@/lib/sync-daemon';

function getSetting(key: string): string | null {
  try {
    if (!getActiveProjectId()) return null;
    const row = db.prepare('SELECT value FROM project_settings WHERE key = ?').get(key) as any;
    return row?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Linear webhook receiver (real-time, recommended over polling). Handles
 * "Comment" events; verifies the HMAC-SHA256 signature against the stored
 * signing secret. Note: Linear must be able to reach this URL publicly — this
 * works on the deployed server (or via a tunnel), not on bare localhost.
 */
export async function POST(request: Request) {
  try {
    const raw = await request.text();

    const secret = getSetting('linear_webhook_secret');
    if (!secret) {
      return NextResponse.json({ success: false, error: 'Webhook secret not configured.' }, { status: 400 });
    }

    // Verify signature (timing-safe) over the raw body.
    const sig = request.headers.get('linear-signature') || '';
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    const valid = sig.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Invalid signature.' }, { status: 401 });
    }

    const payload = JSON.parse(raw);

    // Replay guard: reject events older than a minute.
    if (typeof payload.webhookTimestamp === 'number' && Math.abs(Date.now() - payload.webhookTimestamp) > 60_000) {
      return NextResponse.json({ success: false, error: 'Stale webhook.' }, { status: 400 });
    }

    if (payload.type === 'Comment') {
      const d = payload.data || {};

      // Only accept events for the team this workstation is synced to.
      const teamId = getSetting('linear_team_id');
      const eventTeam = d.issue?.team?.id || d.issue?.teamId || null;
      if (teamId && eventTeam && eventTeam !== teamId) {
        return NextResponse.json({ success: true, ignored: 'other-team' });
      }

      if (payload.action === 'remove') {
        removeLinearComment(d.id);
      } else {
        await ingestLinearComment({
          id: d.id,
          ticketId: d.issueId || d.issue?.id,
          issueIdentifier: d.issue?.identifier,
          author: d.user?.displayName || d.user?.name,
          body: d.body,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        });
      }
    }

    // Always 200 fast so Linear doesn't retry.
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Linear Webhook] Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
