const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function pick(text, language) {
  if (typeof text === "string") return text;
  return text?.[language] ?? text?.en ?? "";
}

function localLevel(level, index, language) {
  return {
    level: index + 1,
    title: pick(level.title, language),
    summary: pick(level.summary, language),
    concepts: level.concepts.map((concept) => concept.id),
  };
}

function conceptEntries(levels, language) {
  return levels.flatMap((level, index) =>
    level.concepts.map((concept) => [concept.id, { title: pick(concept, language) || concept.title || concept.id, use: concept.use ?? "", level: index + 1 }]),
  );
}

/**
 * Reads an authored graph in the learner's language: the levels with their concept ids, and every concept by id.
 * @param {{ levels: { title: object | string, summary: object | string, concepts: { id: string, es?: string, en?: string, use?: string }[] }[] }} seed
 * @param {string} language "es" or "en"
 * @returns {{ levels: { level: number, title: string, summary: string, concepts: string[] }[], concepts: Record<string, { title: string, use: string, level: number }> }}
 */
export function localizeGraph(seed, language) {
  return {
    levels: seed.levels.map((level, index) => localLevel(level, index, language)),
    concepts: Object.fromEntries(conceptEntries(seed.levels, language)),
  };
}

/**
 * The title of a concept in the track's graph, the id itself when the graph does not know it.
 * @param {{ graph?: Record<string, { title: string }> }} track
 * @param {string} id
 * @returns {string}
 */
export function conceptTitle(track, id) {
  return track?.graph?.[id]?.title ?? id;
}

/**
 * Concept ids an exercise of a level may use: everything up to that level, in path order.
 * @param {{ levels: { level: number, concepts: string[] }[] }} path
 * @param {number} level
 * @returns {string[]}
 */
export function conceptsUpTo(path, level) {
  return path.levels.filter((entry) => entry.level <= level).flatMap((entry) => entry.concepts);
}

function conceptProblems(concept, seen) {
  const problems = [];
  if (!SLUG.test(concept?.id ?? "")) problems.push(`concept id "${concept?.id}" must be kebab case`);
  if (seen.has(concept?.id)) problems.push(`concept id "${concept.id}" appears twice`);
  if (!concept?.es || !concept?.en) problems.push(`concept "${concept?.id}" needs a title in es and en`);
  if (!concept?.use) problems.push(`concept "${concept?.id}" needs a "use" line`);
  seen.add(concept?.id);
  return problems;
}

/**
 * Lists what is wrong with an authored graph, so a broken track file fails its test instead of a practice day.
 * @param {object} seed
 * @returns {string[]} empty when the graph is fine
 */
export function graphProblems(seed) {
  if (!Array.isArray(seed?.levels) || seed.levels.length < 4) return ['"levels" must list at least 4 levels'];
  const seen = new Set();
  return seed.levels.flatMap((level, index) => {
    const where = `level ${index + 1}`;
    const problems = [];
    if (!level.title?.es || !level.title?.en) problems.push(`${where}: needs a title in es and en`);
    if (!Array.isArray(level.concepts) || level.concepts.length < 3 || level.concepts.length > 6) problems.push(`${where}: needs 3 to 6 concepts`);
    return [...problems, ...(level.concepts ?? []).flatMap((concept) => conceptProblems(concept, seen))];
  });
}
