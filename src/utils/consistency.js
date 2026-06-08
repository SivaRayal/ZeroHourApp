// ─── Recurring-task consistency ──────────────────────────────────────────────
// Derives a per-day landed/missed record for recurring flights from their
// `dayStatus` map and date window. Used by the TrackScreen consistency report.
//
// A calendar day, for a given recurring task, is one of:
//   'success' – dayStatus[day] === 'landed' (flight landed that day)
//   'failed'  – day is inside the window, fully in the past, and was NOT landed
//               (delayed / never started by end of that day)
//   'pending' – inside the window but today or still upcoming (not yet decided)
//   'na'      – outside the task's [departure .. arrival] date window

import { format } from "date-fns";
import { dateKey } from "./taskStatus";

export const MONTHS_SHORT = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

export const MONTHS_LONG = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

export const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** Only recurring tasks have a consistency report. */
export function recurringTasks(tasks) {
  return (tasks || []).filter((t) => t.recurring);
}

export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/** Weekday (0=Sun..6=Sat) of the 1st of the month. */
export function firstWeekday(year, month) {
  return new Date(year, month, 1).getDay();
}

/** Classify a single calendar day for a recurring task. */
export function dayState(task, year, month, day, now = new Date()) {
  const key = format(new Date(year, month, day), "yyyy-MM-dd");
  const startDay = dateKey(task.startDate);
  const endDay = dateKey(task.endDate);
  if (startDay && key < startDay) return "na";
  if (endDay && key > endDay) return "na";
  if (task.dayStatus && task.dayStatus[key] === "landed") return "success";
  const todayKey = format(now, "yyyy-MM-dd");
  if (key >= todayKey) return "pending"; // today or future → undecided
  return "failed";
}

/** Per-day states for a whole month (index 0 = day 1). */
export function monthStates(task, year, month, now = new Date()) {
  const n = daysInMonth(year, month);
  const out = [];
  for (let d = 1; d <= n; d++) out.push(dayState(task, year, month, d, now));
  return out;
}

/** Roll a list of day-states into counts + an on-time rate. */
export function summarize(states) {
  let success = 0, failed = 0, pending = 0, applicable = 0;
  for (const s of states) {
    if (s === "na") continue;
    applicable++;
    if (s === "success") success++;
    else if (s === "failed") failed++;
    else pending++;
  }
  const decided = success + failed;
  const rate = decided > 0 ? Math.round((success / decided) * 100) : null;
  return { success, failed, pending, applicable, rate };
}

export function monthSummary(task, year, month, now = new Date()) {
  return summarize(monthStates(task, year, month, now));
}

/** 12 month-summaries for a task across one year. */
export function yearSummaries(task, year, now = new Date()) {
  const out = [];
  for (let m = 0; m < 12; m++) out.push(monthSummary(task, year, m, now));
  return out;
}

/** Combine several summaries into one (for the "all flights" total). */
export function combineSummaries(list) {
  const total = { success: 0, failed: 0, pending: 0, applicable: 0, rate: null };
  for (const s of list) {
    total.success += s.success;
    total.failed += s.failed;
    total.pending += s.pending;
    total.applicable += s.applicable;
  }
  const decided = total.success + total.failed;
  total.rate = decided > 0 ? Math.round((total.success / decided) * 100) : null;
  return total;
}
