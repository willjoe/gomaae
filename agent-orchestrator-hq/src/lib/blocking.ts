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
