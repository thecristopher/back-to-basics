import { join } from "node:path";
import { listJsonNames, readJsonIfExists, writeJson } from "./files.js";

function savedTrackFile(config, id) {
  return join(config.dataDir, "tracks", `${id}.json`);
}

async function loadTrack(config, id) {
  const saved = await readJsonIfExists(savedTrackFile(config, id));
  if (saved) return saved;
  const seed = await readJsonIfExists(join(config.tracksDir, `${id}.json`));
  if (!seed) throw new Error(`Unknown track "${id}". Bundled tracks live in tracks/, new ones come from btb learn.`);
  return { ...seed, id, path: null };
}

/**
 * Every active track: the ones in config.tracks first, then the ones learned with btb learn.
 * A track carries its seed (title, language, focus, ladder) and the path Claude drew for it.
 * @param {object} config
 * @returns {Promise<object[]>}
 */
export async function loadTracks(config) {
  const learned = await listJsonNames(join(config.dataDir, "tracks"));
  const ids = [...new Set([...config.tracks, ...learned])];
  return Promise.all(ids.map((id) => loadTrack(config, id)));
}

/**
 * Saves a track with its path.
 * @param {object} config
 * @param {object} track
 */
export async function saveTrack(config, track) {
  await writeJson(savedTrackFile(config, track.id), track);
}
