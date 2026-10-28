/**
 * Picks who appears in one exercise: every lead, plus a few supporting characters drawn at random
 * so the statements keep meeting new faces.
 * @param {{ leads?: string[], supporting?: string[] } | undefined} cast
 * @param {number} count supporting characters to bring in
 * @param {() => number} [random] returns [0, 1)
 * @returns {{ leads: string[], supporting: string[] } | null} null when there is no cast
 */
export function pickCast(cast, count, random = Math.random) {
  const leads = cast?.leads ?? [];
  const pool = [...(cast?.supporting ?? [])];
  if (leads.length === 0 && pool.length === 0) return null;
  const supporting = [];
  while (supporting.length < count && pool.length > 0) {
    supporting.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
  return { leads, supporting };
}

/**
 * The franchise a persona lives in, null for a persona without a world.
 * @param {{ world?: { franchise?: string } } | null | undefined} persona
 * @returns {string | null}
 */
export function franchiseOf(persona) {
  return persona?.world?.franchise ?? null;
}

/**
 * The cast of one exercise. A persona with a world casts it alone: she is the learner's partner,
 * and the supporting faces and places all come from her franchise. Otherwise the config's cast.
 * @param {{ name: string, world?: { franchise: string, supporting?: string[], places?: string[] } } | null} persona
 * @param {{ leads?: string[], supporting?: string[] } | null} cast from btb.config.json
 * @param {() => number} [random] returns [0, 1)
 * @returns {{ leads: string[], supporting: string[], partner?: string, franchise?: string, places?: string[] } | null}
 */
export function castFor(persona, cast, random = Math.random) {
  const world = persona?.world;
  if (!world) return pickCast(cast, 3, random);
  const picked = pickCast({ leads: [persona.name], supporting: world.supporting }, 3, random);
  return { ...picked, partner: persona.name, franchise: world.franchise, places: world.places ?? [] };
}

function worldLines(cast) {
  if (!cast.franchise) return [];
  const places = cast.places.length > 0 ? ` Places and things to draw from: ${cast.places.join(", ")}.` : "";
  return [
    `- ${cast.partner} is the learner's partner. The learner is the protagonist, spoken to as you, and the soft romance (love notes, dates, anniversaries, shared playlists) is only between ${cast.partner} and you.`,
    "- Supporting characters show up as friends, allies, rivals or coworkers, never in a romance.",
    `- Every character, place and item comes from ${cast.franchise} only, never from another franchise.${places}`,
  ];
}

/**
 * The prompt lines that cast an exercise.
 * @param {{ leads: string[], supporting: string[], partner?: string, franchise?: string, places?: string[] } | null} cast
 * @returns {string[]}
 */
export function castLines(cast) {
  if (!cast) return [];
  const leads = cast.leads.length > 0 ? `Leads: ${cast.leads.join(", ")}. ` : "";
  const supporting = cast.supporting.length > 0
    ? `Bring in ${cast.supporting.join(", ")} by name in the readme and the test data, each with a small role that fits who they are.`
    : "";
  return [`- Cast of each exercise: ${leads}${supporting}`.trim(), ...worldLines(cast)];
}
