/**
 * Tiny deterministic content hash (djb2). Used to tell whether a pillar's brief has
 * actually changed since it was last scored — both the scoring API and the Initiative
 * page import this so they hash identically.
 */
export function hashContent(s: string): string {
  const str = (s || '').trim();
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}
