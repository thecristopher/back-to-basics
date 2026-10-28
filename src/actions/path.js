import { withoutEmDashes } from "./json.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function cleanLevel(level, index) {
  return {
    level: index + 1,
    title: withoutEmDashes(level.title),
    summary: withoutEmDashes(level.summary),
    concepts: level.concepts.map(String),
    target: clamp(level.target, 1, 10),
  };
}

/**
 * Turns Claude's path into the stored one: levels numbered from 1, targets in range,
 * and the levels already done kept exactly as they were.
 * @param {{ rationale?: string, startLevel: number, levels: object[] }} draft
 * @param {{ levels: object[], startLevel: number } | null} previous the path being redrawn
 * @param {number} kept how many of the previous levels are done
 * @param {{ fromBasics?: boolean }} [options] fromBasics starts every new path at level 1, whatever the placement said
 * @returns {{ rationale: string, startLevel: number, levels: object[] }}
 */
export function normalizePath(draft, previous, kept, { fromBasics = false } = {}) {
  const keptLevels = previous ? previous.levels.slice(0, kept) : [];
  const levels = [...keptLevels, ...draft.levels.slice(kept)].map(cleanLevel);
  const drawnStart = fromBasics ? 1 : clamp(draft.startLevel, 1, levels.length);
  const startLevel = kept > 0 ? previous.startLevel : drawnStart;
  return { rationale: withoutEmDashes(draft.rationale), startLevel, levels };
}
