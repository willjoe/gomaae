/**
 * Strict, programming-enforced branch naming rules for ticket-driven agents.
 *
 * Epic  → In Progress → release/<epic-title-slug>   (off repo default branch)
 * Story → In Progress → feature/<story-title-slug>  (off parent Epic's release/ branch)
 * Task  → In Progress → task/<task-title-slug>       (off parent Story's feature/ branch)
 * QA / UnitTest        → no new branch               (inherits the linked Task's branch)
 *
 * Branch names are derived from ticket TITLES at the moment the ticket transitions
 * to "In Progress" and stored in the git_branch column so later title renames
 * never silently change the branch name after work has started.
 */

export const BRANCH_OWNING_TIERS = new Set(['Epic', 'Operation', 'Story', 'Task']);

/** Convert a free-form title into a valid, readable git branch segment. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Full branch name for a ticket given its tier and title. */
export function branchName(tier: string, title: string): string {
  const slug = slugify(title);
  if (!slug) throw new Error(`Branch slug is empty for title: "${title}"`);
  switch (tier) {
    case 'Epic':
    case 'Operation': return `release/${slug}`;
    case 'Story':     return `feature/${slug}`;
    case 'Task':      return `task/${slug}`;
    default: throw new Error(`Tier "${tier}" does not own a branch — QA/UnitTest inherit their linked Task's branch.`);
  }
}
