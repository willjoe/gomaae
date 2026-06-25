/**
 * Branch review groups.
 *
 * Test tickets (UnitTest / QA) do NOT get their own branch — they are written on
 * the SAME branch as the Task (or Story) they target, so there is no separate
 * merge for them. A "review group" is therefore all tickets that share one
 * repository branch: the code-producing owner plus every test ticket attached to
 * it. Approving the group merges that one branch and moves every member to Done.
 */

const TEST_TIERS = ['UnitTest', 'QA'];

export interface GroupableTicket {
  id?: string | number;
  identifier: string;
  tier?: string | null;
  status?: string | null;
  linked_ticket_id?: string | null;
  git_branch?: string | null;
}

/**
 * The identifier of the code-producing ticket whose branch holds this ticket's
 * work. Test tickets resolve to their target (via `linked_ticket_id`, which
 * stores the target's identifier — legacy rows may store its id). Everything
 * else owns its own branch.
 */
export function groupOwnerIdentifier(ticket: GroupableTicket, all: GroupableTicket[]): string {
  if (ticket.tier && TEST_TIERS.includes(ticket.tier) && ticket.linked_ticket_id) {
    const ref = String(ticket.linked_ticket_id);
    const target = all.find((t) => t.identifier === ref || String(t.id) === ref);
    if (target) return target.identifier;
  }
  return ticket.identifier;
}

/** The shared repository branch for a ticket's review group. */
export function groupBranch(ticket: GroupableTicket, all: GroupableTicket[]): string {
  const ownerId = groupOwnerIdentifier(ticket, all);
  const owner = ownerId !== ticket.identifier
    ? all.find((t) => t.identifier === ownerId)
    : ticket;
  if (owner?.git_branch) return owner.git_branch;
  return `ticket/${ownerId.toLowerCase()}`;
}

export interface ReviewGroup<T extends GroupableTicket = GroupableTicket> {
  branch: string;
  ownerIdentifier: string;
  owner: T | null;
  /** All tickets sharing this branch — owner first, then test tickets. */
  tickets: T[];
  inReviewCount: number;
  total: number;
  /** A branch is "fulfilled" (ready to merge) once every member is In Review. */
  fulfilled: boolean;
  /** Members not yet In Review (what the branch is still waiting on). */
  pending: T[];
}

const isOwnerTicket = (t: GroupableTicket, ownerIdentifier: string) =>
  t.identifier.toLowerCase() === ownerIdentifier.toLowerCase();

/** Build one ReviewGroup per repository branch from a ticket list. */
export function buildReviewGroups<T extends GroupableTicket>(all: T[]): ReviewGroup<T>[] {
  const byBranch = new Map<string, { tickets: T[]; ownerIdentifier: string }>();
  for (const tk of all) {
    const b = groupBranch(tk, all);
    const ownerId = groupOwnerIdentifier(tk, all);
    if (!byBranch.has(b)) byBranch.set(b, { tickets: [], ownerIdentifier: ownerId });
    byBranch.get(b)!.tickets.push(tk);
  }

  const groups: ReviewGroup<T>[] = [];
  byBranch.forEach(({ tickets, ownerIdentifier }, branch) => {
    // Owner (code ticket) first, then test tickets, both stable by identifier.
    const sorted = [...tickets].sort((a, b) => {
      const ao = isOwnerTicket(a, ownerIdentifier) ? 0 : 1;
      const bo = isOwnerTicket(b, ownerIdentifier) ? 0 : 1;
      return ao - bo || a.identifier.localeCompare(b.identifier);
    });
    const owner = sorted.find((t) => isOwnerTicket(t, ownerIdentifier)) ?? null;
    const inReviewCount = sorted.filter((t) => t.status === 'In Review').length;
    const pending = sorted.filter((t) => t.status !== 'In Review');
    groups.push({
      branch,
      ownerIdentifier: owner?.identifier ?? ownerIdentifier,
      owner,
      tickets: sorted,
      inReviewCount,
      total: sorted.length,
      fulfilled: sorted.length > 0 && pending.length === 0,
      pending,
    });
  });
  return groups;
}

/** The review group a single ticket belongs to. */
export function getReviewGroupFor<T extends GroupableTicket>(ticket: T, all: T[]): ReviewGroup<T> {
  const branch = groupBranch(ticket, all);
  return buildReviewGroups(all).find((g) => g.branch === branch)!;
}
