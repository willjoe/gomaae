/**
 * Single source of truth for ticket creation rules.
 * All creation paths (API route, AI generators) call createTicket() so
 * validation and scheduling constraints are enforced in one place.
 */
import { toISODatetime } from './epicDates';

const VALID_TIERS = new Set([
  'Epic', 'Operation', 'Story', 'Task', 'QA', 'UnitTest', 'Triage', 'Document',
]);

// These tiers require an assigned role + authorized AI model.
const ROLE_REQUIRED_TIERS = new Set(['Story', 'Task', 'QA', 'UnitTest', 'Triage']);
// These tiers must have a parent ticket in the hierarchy.
const PARENT_REQUIRED_TIERS = new Set(['Story', 'Task', 'QA', 'UnitTest']);
// These tiers must have scheduled datetimes (they are executed by AI agents).
const DATE_REQUIRED_TIERS = new Set(['Task', 'QA', 'UnitTest']);

export interface TicketCreateInput {
  title: string;
  description: string;
  tier: string;
  status?: string;
  parent_id?: string | null;
  start_datetime?: string | null;
  due_datetime?: string | null;
  llm_role?: string | null;
  authorized_model?: string | null;
  linked_ticket_id?: string | null;
  blocked_by?: string | null;
  expected_token_usage?: number | null;
  document_content?: string | null;
  document_name?: string | null;
  document_path?: string | null;
  document_type?: string | null;
  assigned_agent_id?: string | null;
}

/**
 * If any sibling (same parent + same llm_role) has a due_datetime later than
 * the proposed start, push start (and due) forward so they don't overlap.
 * Maintains the ticket's original duration.
 */
function enforceNoOverlap(
  db: any,
  parentId: string | null | undefined,
  role: string | null | undefined,
  startIso: string,
  dueIso: string,
): { start: string; due: string } {
  if (!parentId || !role) return { start: startIso, due: dueIso };

  const latest = db.prepare(
    'SELECT MAX(due_datetime) as max_due FROM tickets WHERE parent_id = ? AND llm_role = ?',
  ).get(parentId, role) as any;

  if (!latest?.max_due) return { start: startIso, due: dueIso };

  const latestDue    = new Date(latest.max_due);
  const proposedStart = new Date(startIso);

  if (proposedStart >= latestDue) return { start: startIso, due: dueIso };

  // Push forward: maintain duration (milliseconds)
  const durationMs = new Date(dueIso).getTime() - new Date(startIso).getTime();
  const newStart   = latestDue;
  const newDue     = new Date(newStart.getTime() + Math.max(durationMs, 60 * 60 * 1000)); // min 1 h

  return {
    start: toISODatetime(newStart),
    due:   toISODatetime(newDue),
  };
}

/**
 * Validate then insert a ticket row.
 * Throws Error with a human-readable message on any violation.
 * Returns { id, identifier } of the created row.
 */
export function createTicket(db: any, data: TicketCreateInput): { id: string; identifier: string } {
  // ── Validation ────────────────────────────────────────────────────────────
  if (!data.title?.trim()) {
    throw new Error('title is required and must not be empty');
  }
  if (data.tier !== 'Document' && !data.description?.trim()) {
    throw new Error('description is required and must not be empty');
  }
  if (!VALID_TIERS.has(data.tier)) {
    throw new Error(`Invalid tier "${data.tier}". Valid values: ${[...VALID_TIERS].join(', ')}`);
  }
  if (ROLE_REQUIRED_TIERS.has(data.tier)) {
    if (!data.llm_role?.trim()) throw new Error(`llm_role (assigned role) is required for ${data.tier} tickets`);
    if (!data.authorized_model?.trim()) throw new Error(`authorized_model is required for ${data.tier} tickets — set a default AI engine in workspace settings`);
  }
  if (PARENT_REQUIRED_TIERS.has(data.tier)) {
    if (!data.parent_id?.trim()) throw new Error(`A parent ticket is required for ${data.tier} tickets`);
  }
  if (DATE_REQUIRED_TIERS.has(data.tier)) {
    if (!data.start_datetime) throw new Error(`start_datetime is required for ${data.tier} tickets`);
    if (!data.due_datetime)   throw new Error(`due_datetime is required for ${data.tier} tickets`);
  }

  // ── Non-overlap: same parent + same role must not share time windows ──────
  let finalStart = data.start_datetime || null;
  let finalDue   = data.due_datetime   || null;
  if (finalStart && finalDue && data.parent_id && data.llm_role) {
    const adjusted = enforceNoOverlap(db, data.parent_id, data.llm_role, finalStart, finalDue);
    finalStart = adjusted.start;
    finalDue   = adjusted.due;
  }

  // ── Identifier generation ─────────────────────────────────────────────────
  const id = `tkt-${Math.random().toString(36).substr(2, 9)}`;
  const countRes = db.prepare('SELECT count(*) as c FROM tickets').get() as any;
  const PREFIX: Record<string, string> = {
    Epic: 'EPC', Operation: 'OPS', QA: 'QA', UnitTest: 'UT', Triage: 'BUG',
  };
  const identifier = `${PREFIX[data.tier] || 'TKT'}-${1000 + (countRes?.c || 0)}`;

  // ── Insert ────────────────────────────────────────────────────────────────
  db.prepare(`
    INSERT INTO tickets (
      id, identifier, title, description, status, tier, parent_id,
      start_datetime, due_datetime, llm_role, authorized_model, linked_ticket_id,
      blocked_by, expected_token_usage,
      document_content, document_name, document_path, document_type,
      assigned_agent_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, identifier,
    data.title.trim(),
    data.description?.trim() || null,
    data.status || 'Backlog',
    data.tier,
    data.parent_id        || null,
    finalStart,
    finalDue,
    data.llm_role         || null,
    data.authorized_model || null,
    data.linked_ticket_id || null,
    data.blocked_by       || null,
    data.expected_token_usage ?? null,
    data.document_content  || null,
    data.document_name     || null,
    data.document_path     || null,
    data.document_type     || null,
    data.assigned_agent_id || null,
  );

  return { id, identifier };
}
