// ─── Task status model ───────────────────────────────────────────────────────
// A task (scheduled flight) is one of two types:
//
//   SINGLE   (recurring: false) — happens once. Departure/Arrival are absolute
//            datetimes. Status lives in `task.status` and progresses one time:
//            SCHEDULED → DELAYED → INFLIGHT → LANDED.
//
//   RECURRING (recurring: true) — repeats every day within a date window.
//            The Departure & Arrival DATES define the window [startDay..endDay];
//            their TIMES define each day's departure & arrival. Each day inside
//            the window runs its own SCHEDULED → DELAYED → INFLIGHT → LANDED
//            cycle. Manual INFLIGHT/LANDED transitions are stored per-day in
//            `task.dayStatus = { 'yyyy-MM-dd': 'inflight' | 'landed' }`.
//            Before the window: SCHEDULED. After the window: inactive (LANDED).

import { format } from "date-fns";

const DAY_MS = 24 * 3600 * 1000;

/** Calendar-day key for a Date, e.g. "2026-06-08". */
export function todayKey(now = new Date()) {
  return format(now, "yyyy-MM-dd");
}

/** Date portion ("yyyy-MM-dd") of a stored "yyyy-MM-dd HH:mm" string. */
export function dateKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr.replace(" ", "T"));
  if (isNaN(d.getTime())) return null;
  return format(d, "yyyy-MM-dd");
}

/** Extract "HH:mm" time-of-day from a stored "yyyy-MM-dd HH:mm" string. */
export function timeOfDay(dateStr, fallback = "09:00") {
  if (!dateStr) return fallback;
  const d = new Date(dateStr.replace(" ", "T"));
  if (isNaN(d.getTime())) return fallback;
  return format(d, "HH:mm");
}

/** A Date for the given "HH:mm" on `now`'s calendar day. */
function todayAt(hhmm, now) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return d;
}

// ─── Recurring helpers ────────────────────────────────────────────────────────

/** Today's departure Date for a recurring task. */
export function departureToday(task, now = new Date()) {
  return todayAt(timeOfDay(task.startDate), now);
}

/**
 * Today's arrival Date for a recurring task, or null if no arrival time.
 * If arrival time is at/before departure, it's an overnight flight (+1 day).
 */
export function arrivalToday(task, now = new Date()) {
  if (!task.endDate) return null;
  const dep = departureToday(task, now);
  let arr = todayAt(timeOfDay(task.endDate), now);
  if (arr.getTime() <= dep.getTime()) arr = new Date(arr.getTime() + DAY_MS);
  return arr;
}

/**
 * Where `now` sits relative to a recurring task's date window:
 * "before" | "within" | "after". An open-ended task (no endDate) is never
 * "after".
 */
export function windowPosition(task, now = new Date()) {
  const today = todayKey(now);
  const startDay = dateKey(task.startDate);
  const endDay = dateKey(task.endDate);
  if (startDay && today < startDay) return "before";
  if (endDay && today > endDay) return "after";
  return "within";
}

// ─── Status resolution ────────────────────────────────────────────────────────

function getRecurringStatus(task, now) {
  // A manual takeoff/land recorded for today always wins.
  const manual = task.dayStatus && task.dayStatus[todayKey(now)];
  if (manual === "inflight" || manual === "landed") return manual;
  const pos = windowPosition(task, now);
  if (pos === "before") return "scheduled"; // window hasn't opened yet
  if (pos === "after") return "landed"; // window closed → inactive
  return now.getTime() >= departureToday(task, now).getTime()
    ? "delayed"
    : "scheduled";
}

function getSingleStatus(task, now) {
  if (task.status === "inflight" || task.status === "landed") return task.status;
  const dep = new Date(task.startDate.replace(" ", "T")).getTime();
  return now.getTime() >= dep ? "delayed" : "scheduled";
}

/** Live status for a task of either type. */
export function getTaskStatus(task, now = new Date()) {
  return task.recurring
    ? getRecurringStatus(task, now)
    : getSingleStatus(task, now);
}

/** True while a recurring task is still cycling (within its window). */
export function isRecurringActive(task, now = new Date()) {
  return task.recurring && windowPosition(task, now) === "within";
}

/**
 * Today's departure Date for any task (recurring → today's occurrence,
 * single → its absolute departure).
 */
export function departureDateTime(task, now = new Date()) {
  return task.recurring
    ? departureToday(task, now)
    : new Date(task.startDate.replace(" ", "T"));
}

/** Arrival Date for any task, or null when no arrival time is set. */
export function arrivalDateTime(task, now = new Date()) {
  if (!task.endDate) return null;
  return task.recurring
    ? arrivalToday(task, now)
    : new Date(task.endDate.replace(" ", "T"));
}

/**
 * Return a copy of the task with its status set.
 *   recurring → 'inflight'/'landed' stored per-day; 'scheduled'/'delayed' clears
 *               today's override (back to automatic).
 *   single    → written to `task.status` (scheduled/delayed are recomputed live,
 *               so only inflight/landed actually stick).
 */
export function setTaskStatus(task, status, now = new Date()) {
  if (task.recurring) {
    const key = todayKey(now);
    const dayStatus = { ...(task.dayStatus || {}) };
    if (status === "inflight" || status === "landed") dayStatus[key] = status;
    else delete dayStatus[key];
    return { ...task, dayStatus };
  }
  return { ...task, status };
}

/**
 * Migrate stored tasks to the current model.
 *   - tasks with an explicit `recurring` flag are left alone (recurring ones
 *     just get a dayStatus map if missing).
 *   - legacy tasks (no `recurring` field) become SINGLE instances, preserving
 *     their existing `status`.
 * Returns { task, changed }.
 */
export function migrateTask(task) {
  if (typeof task.recurring === "boolean") {
    if (task.recurring && !task.dayStatus) {
      return { task: { ...task, dayStatus: {} }, changed: true };
    }
    return { task, changed: false };
  }
  return { task: { ...task, recurring: false }, changed: true };
}
