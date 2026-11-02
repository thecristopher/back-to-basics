import { withoutEmDashes } from "./json.js";
import { toSlug } from "../utils/slug.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

// Claude names each concept with an id and a title; a bare string from an older answer still works
function conceptOf(concept) {
  if (typeof concept === "string") return { id: toSlug(concept), title: withoutEmDashes(concept), use: "" };
  return { id: toSlug(concept.id ?? concept.title), title: withoutEmDashes(concept.title ?? concept.id), use: withoutEmDashes(concept.use ?? "") };
}

function cleanLevel(level, index) {
  return {
    level: index + 1,
    title: withoutEmDashes(level.title),
    summary: withoutEmDashes(level.summary),
    concepts: level.concepts.map(conceptOf),
  };
}

function graphOf(levels) {
  return Object.fromEntries(levels.flatMap((level) => level.concepts.map((concept) => [concept.id, { title: concept.title, use: concept.use, level: level.level }])));
}

function keptAsDrafts(previous, graph, kept) {
  if (!previous) return [];
  return previous.levels.slice(0, kept).map((level) => ({ ...level, concepts: level.concepts.map((id) => ({ id, title: graph[id]?.title ?? id, use: graph[id]?.use ?? "" })) }));
}

/**
 * Turns the path Claude drew for a learned language into the stored one: levels numbered from 1,
 * concepts as ids with their titles in the graph, and the levels already done kept exactly as they were.
 * @param {{ rationale?: string, startLevel: number, levels: object[] }} draft
 * @param {{ levels: { concepts: string[] }[], startLevel: number } | null} previous the path being redrawn
 * @param {number} kept how many of the previous levels are done
 * @param {{ fromBasics?: boolean, graph?: Record<string, object> }} [options] fromBasics starts every new path at level 1,
 *   graph is the previous graph, to keep the titles of the kept levels
 * @returns {{ path: { rationale: string, startLevel: number, levels: object[] }, graph: Record<string, { title: string, use: string, level: number }> }}
 */
export function normalizePath(draft, previous, kept, { fromBasics = false, graph = {} } = {}) {
  const levels = [...keptAsDrafts(previous, graph, kept), ...draft.levels.slice(kept)].map(cleanLevel);
  const drawnStart = fromBasics ? 1 : clamp(draft.startLevel, 1, levels.length);
  const startLevel = kept > 0 ? previous.startLevel : drawnStart;
  const stored = levels.map((level) => ({ ...level, concepts: level.concepts.map((concept) => concept.id) }));
  return { path: { rationale: withoutEmDashes(draft.rationale), startLevel, levels: stored }, graph: graphOf(levels) };
}
