/**
 * Single source of truth for ticket creation rules.
 * All creation paths (API route, AI generators) call createTicket() so
 * validation is enforced in one place and never silently skipped.
 */

const VALID_TIERS = new Set([
  'Epic', 'Operation', 'Story', 'Task', 'QA', 'UnitTest', 'Triage', 'Document',
]);

// These tiers are executed by AI agents and must have role + dates before creation.
const AGENT_TIERS = new Set(['Task', 'QA']);

export interface TicketCreateInput {
  title: string;
  description: string;
  tier: string;
  status?: string;
  parent_id?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  llm_role?: string | null;
  authorized_model?: string | null;
  linked_ticket_id?: string | null;
  expected_token_usage?: number | null;
  document_content?: string | null;
  document_name?: string | null;
  document_path?: string | null;
  document_type?: string | null;
  blocked_by?: string | null;
  assigned_agent_id?: string | null;
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
  if (AGENT_TIERS.has(data.tier)) {
    if (!data.start_date) throw new Error(`start_date is required for ${data.tier} tickets`);
    if (!data.due_date)   throw new Error(`due_date is required for ${data.tier} tickets`);
    if (!data.llm_role?.trim()) throw new Error(`llm_role is required for ${data.tier} tickets`);
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
      start_date, due_date, llm_role, authorized_model, linked_ticket_id,
      expected_token_usage, document_content, document_name, document_path, document_type,
      blocked_by, assigned_agent_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, identifier,
    data.title.trim(),
    data.description?.trim() || null,
    data.status || 'Backlog',
    data.tier,
    data.parent_id    || null,
    data.start_date   || null,
    data.due_date     || null,
    data.llm_role     || null,
    data.authorized_model || null,
    data.linked_ticket_id || null,
    data.expected_token_usage ?? null,
    data.document_content  || null,
    data.document_name     || null,
    data.document_path     || null,
    data.document_type     || null,
    data.blocked_by        || null,
    data.assigned_agent_id || null,
  );

  return { id, identifier };
}
