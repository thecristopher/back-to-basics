import { join } from "node:path";
import { localizeGraph } from "../actions/graph.js";
import { listJsonNames, readJsonIfExists, writeJson } from "./files.js";

function savedTrackFile(config, id) {
  return join(config.dataDir, "tracks", `${id}.json`);
}

function ladderOf(graph) {
  return graph.levels.map((level) => `${level.title}: ${level.concepts.map((id) => graph.concepts[id].title).join(", ")}`);
}

// an authored track always reads its levels and concepts from the bundled graph, so editing the graph reaches every learner
function authoredTrack(seed, saved, id, language) {
  const graph = localizeGraph(seed, language);
  const { levels: _seedLevels, ...rest } = seed;
  const path = saved?.path ? { ...saved.path, levels: graph.levels } : null;
  return { ...rest, ...(saved?.goal ? { goal: saved.goal } : {}), id, authored: true, graph: graph.concepts, levels: graph.levels, ladder: ladderOf(graph), path };
}

async function loadTrack(config, id) {
  const saved = await readJsonIfExists(savedTrackFile(config, id));
  const seed = await readJsonIfExists(join(config.tracksDir, `${id}.json`));
  if (seed?.levels) return authoredTrack(seed, saved, id, config.language);
  if (saved) return { graph: {}, ...saved };
  if (!seed) throw new Error(`Unknown track "${id}". Bundled tracks live in tracks/, new ones come from btb learn.`);
  return { ...seed, id, graph: {}, path: null };
}

/**
 * Every active track: the ones in config.tracks first, then the ones learned with btb learn.
 * A bundled track carries its authored graph (levels and concepts by id); a learned one carries
 * the path and graph Claude drew for it.
 * @param {object} config
 * @returns {Promise<object[]>}
 */
export async function loadTracks(config) {
  const learned = await listJsonNames(join(config.dataDir, "tracks"));
  const ids = [...new Set([...config.tracks, ...learned])];
  return Promise.all(ids.map((id) => loadTrack(config, id)));
}

/**
 * Saves a track with its path. An authored track keeps only what is the learner's own, its graph lives in tracks/.
 * @param {object} config
 * @param {object} track
 */
export async function saveTrack(config, track) {
  if (!track.authored) return writeJson(savedTrackFile(config, track.id), track);
  const { levels: _levels, ...path } = track.path ?? {};
  await writeJson(savedTrackFile(config, track.id), { id: track.id, ...(track.goal ? { goal: track.goal } : {}), path: track.path ? path : null });
}
