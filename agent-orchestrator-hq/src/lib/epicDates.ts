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

/** Default estimate per engineering task (calendar days, inclusive of the start day). */
const TASK_DURATION_DAYS = 3;

/** QA tickets start the day after their linked Task's due date. */
const QA_DURATION_DAYS = 2;

const addDays = (iso: string, n: number): string => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return localISODate(d);
};

/**
 * Default waterfall scheduling for an Epic's tree, applied whenever a Story or
 * Task is created under it:
 *  - the first Story (and its first Task) starts on the Epic's start date
 *  - each Task gets a TASK_DURATION_DAYS estimate; the next Task starts the day
 *    after the previous Task's due date
 *  - a Story's window is exactly its Task chain (so Tasks always fit the Story);
 *    the next Story starts the day after the previous Story's due date
 *  - the Epic's Target Delivery then follows the last Story (recalc below)
 * Ordering follows creation order, so later additions extend the chain.
 */
export function scheduleEpicTree(epicId: string | null | undefined): void {
  if (!epicId) return;
  const epic = db.prepare('SELECT id, tier, start_date FROM tickets WHERE id = ?').get(epicId) as any;
  if (!epic || epic.tier !== 'Epic' || !epic.start_date) return;

  const upd = db.prepare('UPDATE tickets SET start_date = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  const stories = db.prepare("SELECT id FROM tickets WHERE parent_id = ? AND tier = 'Story' ORDER BY created_at, identifier").all(epicId) as any[];

  let storyStart = epic.start_date as string;
  for (const s of stories) {
    const tasks = db.prepare("SELECT id, identifier FROM tickets WHERE parent_id = ? AND tier = 'Task' ORDER BY created_at, identifier").all(s.id) as any[];
    let taskStart = storyStart;
    let storyDue = addDays(storyStart, TASK_DURATION_DAYS - 1); // a story with no tasks still gets one estimate window
    for (const t of tasks) {
      const taskDue = addDays(taskStart, TASK_DURATION_DAYS - 1);
      upd.run(taskStart, taskDue, t.id);
      storyDue = taskDue;

      // QA tickets linked to this task start the day after the task's due date.
      // linked_ticket_id stores the task's identifier string (e.g. "TKT-1012"),
      // so match on both identifier and id to handle legacy rows.
      const qaStart = addDays(taskDue, 1);
      const qaEnd = addDays(qaStart, QA_DURATION_DAYS - 1);
      db.prepare("UPDATE tickets SET start_date = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE (linked_ticket_id = ? OR linked_ticket_id = ?) AND (tier = 'QA' OR tier = 'UnitTest')")
        .run(qaStart, qaEnd, t.identifier, t.id);

      taskStart = addDays(taskDue, 1);
    }
    upd.run(storyStart, storyDue, s.id);
    storyStart = addDays(storyDue, 1);
  }
  recalcEpicTargetDelivery(epicId);
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
