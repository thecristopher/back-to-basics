import { addDays } from "../utils/dates.js";

/**
 * Projects when each level will be done at the configured pace, walking the path in order.
 * @param {{ track: string, level: number, remaining: number, done: boolean }[]} levels in path order
 * @param {{ perSession: number, daysPerWeek: number, today: string }} pace perSession may be fractional when tracks share the day
 * @returns {Array<object & { finishBy: string | null }>} finishBy is null for levels already done
 */
export function projectLevels(levels, { perSession, daysPerWeek, today }) {
  let queued = 0;
  return levels.map((level) => {
    if (level.done) return { ...level, finishBy: null };
    queued += level.remaining;
    const sessions = Math.ceil(queued / perSession);
    const calendarDays = Math.ceil((sessions * 7) / daysPerWeek);
    return { ...level, finishBy: addDays(today, calendarDays) };
  });
}

/**
 * Checks a goal against the projection.
 * @param {{ title: string, track: string, level: number, by: string }} goal
 * @param {Array<{ track: string, level: number, done: boolean, finishBy: string | null }>} projection
 * @returns {object & { state: "done" | "onTrack" | "behind" | "unknown", finishBy?: string }}
 */
export function goalStatus(goal, projection) {
  const target = projection.find((level) => level.track === goal.track && level.level === goal.level);
  if (!target) return { ...goal, state: "unknown" };
  if (target.done) return { ...goal, state: "done" };
  const state = target.finishBy <= goal.by ? "onTrack" : "behind";
  return { ...goal, state, finishBy: target.finishBy };
}
