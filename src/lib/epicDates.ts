import { db } from './db';

const pad = (n: number) => String(n).padStart(2, '0');

/** Format a Date as local YYYY-MM-DDTHH:MM:SS (avoids UTC-shift). */
export function toISODatetime(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Parse any ISO date or datetime string safely. */
function parseLocal(iso: string): Date {
  return new Date(iso.includes('T') ? iso : `${iso}T00:00:00`);
}

/** Add n calendar days, preserving the time component. */
export function addCalendarDays(iso: string, n: number): string {
  const d = parseLocal(iso);
  d.setDate(d.getDate() + n);
  return toISODatetime(d);
}

/** ISO datetime of next Monday at 09:00:00. */
export function nextMonday(from = new Date()): string {
  const d = new Date(from);
  const delta = ((8 - d.getDay()) % 7) || 7;
  d.setDate(d.getDate() + delta);
  d.setHours(9, 0, 0, 0);
  return toISODatetime(d);
}

/** Due datetime = start + (durationDays - 1) calendar days at 17:00:00.
 *  A 3-day task starting Mon 09:00 → Wed 17:00. */
export function dueDatetime(startIso: string, durationDays: number): string {
  const d = parseLocal(startIso);
  d.setDate(d.getDate() + Math.max(0, durationDays - 1));
  d.setHours(17, 0, 0, 0);
  return toISODatetime(d);
}

/** Next day at 09:00:00 (used to chain task→QA, story→story, etc.). */
export function nextDayAt9(iso: string): string {
  const d = parseLocal(iso);
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return toISODatetime(d);
}

/** Default estimate per engineering task (calendar days). */
const TASK_DURATION_DAYS = 3;

/** QA window (calendar days). */
const QA_DURATION_DAYS = 2;

/**
 * Default waterfall scheduling for an Epic's tree, applied whenever a Story or
 * Task is created under it:
 *  - the first Story (and its first Task) starts on the Epic's start_datetime
 *  - each Task gets a TASK_DURATION_DAYS window; the next Task starts the day
 *    after the previous Task's due_datetime
 *  - a Story's window is exactly its Task chain; the next Story starts the day
 *    after the previous Story's due_datetime
 *  - the Epic's Target Delivery follows the last Story
 * Ordering follows creation order, so later additions extend the chain.
 */
export function scheduleEpicTree(epicId: string | null | undefined): void {
  if (!epicId) return;
  const epic = db.prepare('SELECT id, tier, start_datetime FROM tickets WHERE id = ?').get(epicId) as any;
  if (!epic || epic.tier !== 'Epic' || !epic.start_datetime) return;

  const upd = db.prepare('UPDATE tickets SET start_datetime = ?, due_datetime = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  const stories = db.prepare("SELECT id FROM tickets WHERE parent_id = ? AND tier = 'Story' ORDER BY created_at, identifier").all(epicId) as any[];

  let storyStart = epic.start_datetime as string;
  for (const s of stories) {
    const tasks = db.prepare("SELECT id, identifier FROM tickets WHERE parent_id = ? AND tier = 'Task' ORDER BY created_at, identifier").all(s.id) as any[];
    let taskStart = storyStart;
    let storyDue = dueDatetime(storyStart, TASK_DURATION_DAYS); // provisional (no tasks)
    for (const t of tasks) {
      const taskDue = dueDatetime(taskStart, TASK_DURATION_DAYS);
      upd.run(taskStart, taskDue, t.id);
      storyDue = taskDue;

      // QA tickets linked to this task start the day after the task's due_datetime.
      const qaStart = nextDayAt9(taskDue);
      const qaEnd   = dueDatetime(qaStart, QA_DURATION_DAYS);
      db.prepare("UPDATE tickets SET start_datetime = ?, due_datetime = ?, updated_at = CURRENT_TIMESTAMP WHERE (linked_ticket_id = ? OR linked_ticket_id = ?) AND (tier = 'QA' OR tier = 'UnitTest')")
        .run(qaStart, qaEnd, t.identifier, t.id);

      taskStart = nextDayAt9(taskDue);
    }
    upd.run(storyStart, storyDue, s.id);
    storyStart = nextDayAt9(storyDue);
  }
  recalcEpicTargetDelivery(epicId);
}

/**
 * Recalculate an Epic's Target Delivery (due_datetime) from its Story children.
 */
export function recalcEpicTargetDelivery(epicId: string | null | undefined): void {
  if (!epicId) return;
  const epic = db.prepare('SELECT id, tier, start_datetime FROM tickets WHERE id = ?').get(epicId) as any;
  if (!epic || epic.tier !== 'Epic') return;

  const stories = db.prepare("SELECT start_datetime, due_datetime FROM tickets WHERE parent_id = ? AND tier = 'Story'").all(epicId) as any[];
  let due: string | null = null;
  if (stories.length > 0) {
    const dates = stories.map((s: any) => s.due_datetime || s.start_datetime).filter(Boolean).sort();
    if (dates.length > 0) {
      due = dates[dates.length - 1];
    } else if (epic.start_datetime) {
      const d = parseLocal(epic.start_datetime);
      d.setDate(d.getDate() + 28);
      d.setHours(17, 0, 0, 0);
      due = toISODatetime(d);
    }
  }
  db.prepare('UPDATE tickets SET due_datetime = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(due, epicId);
}
