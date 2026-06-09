/**
 * Ticket dependency / blocking helpers.
 *
 * A ticket is "blocked" while any ticket listed in its `blocked_by` is not yet
 * Done. The `blocking` / `blocked_by` attributes are a PERMANENT record of the
 * dependency graph and are never cleared when a blocker completes — resolution
 * is derived purely by querying the blocker's status.
 */
export interface BlockableTicket {
  identifier: string;
  status: string;
  blocked_by?: string | null;
}

/** Parse a comma/space separated identifier list (e.g. "TKT-1004, QA-1005"). */
export function parseIds(raw?: string | null): string[] {
  if (!raw) return [];
  return raw.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
}

/** Identifiers in `ticket.blocked_by` whose ticket is not yet Done (still blocking). */
export function getActiveBlockers(ticket: { blocked_by?: string | null }, all: BlockableTicket[]): string[] {
  return parseIds(ticket.blocked_by).filter((id) => {
    const blocker = all.find((t) => t.identifier === id);
    // Not blocked once the blocking ticket is Done. Unknown references are ignored.
    return blocker ? blocker.status !== 'Done' : false;
  });
}

export const isTicketBlocked = (ticket: { blocked_by?: string | null }, all: BlockableTicket[]): boolean =>
  getActiveBlockers(ticket, all).length > 0;

/**
 * Identifiers of tickets that THIS ticket blocks — derived from other tickets'
 * `blocked_by`. There is no stored `blocking` column; it's always computed from
 * the canonical `blocked_by` edges, so it can never drift.
 */
export function getBlocking(identifier: string, all: { identifier: string; blocked_by?: string | null }[]): string[] {
  return all.filter((t) => parseIds(t.blocked_by).includes(identifier)).map((t) => t.identifier);
}

/** A target Task has reviewable code once it has reached In Review (PR open) or merged (Done). */
const TEST_READY_STATUSES = ['In Review', 'Done'];

export interface TestTicket {
  tier?: string | null;
  linked_ticket_id?: string | null;
}

export interface TargetTicket {
  id?: string | number;
  identifier: string;
  status: string;
}

/**
 * The target a UnitTest ticket verifies. UT tickets reference the Task they test
 * via `linked_ticket_id` (the Task's identifier; legacy rows may store the id).
 * Returns null for non-UnitTest tickets or when the target can't be resolved.
 */
export function getUnitTestTarget(ticket: TestTicket, all: TargetTicket[]): TargetTicket | null {
  if (ticket.tier !== 'UnitTest' || !ticket.linked_ticket_id) return null;
  const ref = String(ticket.linked_ticket_id);
  return all.find((t) => t.identifier === ref || String(t.id) === ref) ?? null;
}

/**
 * Whether a ticket is allowed to start an agent run. A UnitTest can only start
 * once the Task it targets has produced reviewable code (reached In Review). If
 * the target doesn't exist yet (the task it tests isn't created), it cannot
 * start. All non-UnitTest tickets pass this gate (their dependency gating is
 * handled separately by isTicketBlocked).
 */
export function isStartGateSatisfied(ticket: TestTicket, all: TargetTicket[]): boolean {
  if (ticket.tier !== 'UnitTest') return true;
  const target = getUnitTestTarget(ticket, all);
  if (!target) return false;
  return TEST_READY_STATUSES.includes(target.status);
}
