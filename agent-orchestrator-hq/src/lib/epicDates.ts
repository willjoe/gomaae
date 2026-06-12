import { db } from './db';

/** Format a Date as local YYYY-MM-DD (toISOString would shift across the UTC boundary). */
const localISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** ISO date (YYYY-MM-DD) of the next Monday strictly after `from`. */
export function nextMonday(from = new Date()): string {
  const d = new Date(from);
  const delta = ((8 - d.getDay()) % 7) || 7;
  d.setDate(d.getDate() + delta);
  return localISODate(d);
}

/**
 * Recalculate an Epic's Target Delivery (due_date) from its Story children.
 *  - no stories             -> cleared (the target appears once the first story exists)
 *  - stories carrying dates -> the latest of their due/start dates
 *  - stories with no dates  -> provisional: epic start + 28 days
 * Called whenever a story under the epic is created or changed.
 */
export function recalcEpicTargetDelivery(epicId: string | null | undefined): void {
  if (!epicId) return;
  const epic = db.prepare('SELECT id, tier, start_date FROM tickets WHERE id = ?').get(epicId) as any;
  if (!epic || epic.tier !== 'Epic') return;

  const stories = db.prepare("SELECT start_date, due_date FROM tickets WHERE parent_id = ? AND tier = 'Story'").all(epicId) as any[];
  let due: string | null = null;
  if (stories.length > 0) {
    // ISO strings sort chronologically; a story's due date wins over its start date.
    const dates = stories.map((s) => s.due_date || s.start_date).filter(Boolean).sort();
    if (dates.length > 0) {
      due = dates[dates.length - 1];
    } else if (epic.start_date) {
      // Parse as local midnight (a bare YYYY-MM-DD would otherwise parse as UTC).
      const d = new Date(`${epic.start_date}T00:00:00`);
      d.setDate(d.getDate() + 28);
      due = localISODate(d);
    }
  }
  db.prepare('UPDATE tickets SET due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(due, epicId);
}
