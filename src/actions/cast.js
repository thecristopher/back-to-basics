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
  const supporting = cast?.supporting ?? [];
  if (leads.length === 0 && supporting.length === 0) return null;
  return { leads, supporting: drawFrom(supporting, count, random) };
}

/**
 * Draws up to count different entries at random, the list itself stays untouched.
 * @param {string[]} list
 * @param {number} count
 * @param {() => number} [random] returns [0, 1)
 * @returns {string[]}
 */
export function drawFrom(list, count, random = Math.random) {
  const pool = [...list];
  const drawn = [];
  while (drawn.length < count && pool.length > 0) {
    drawn.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
  return drawn;
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
 * Who leads the story of one exercise: someone in its cast with lore of their own, the partner included.
 * @param {string[]} faces the partner and the supporting characters picked
 * @param {Record<string, string[]>} lore scenes per character
 * @param {() => number} [random] returns [0, 1)
 * @returns {string | null} null when nobody in the cast has lore
 */
export function pickFeatured(faces, lore, random = Math.random) {
  return drawFrom(faces.filter((face) => lore[face]?.length > 0), 1, random)[0] ?? null;
}

/**
 * The cast of one exercise. A persona with a world casts it alone: she coaches, the learner's partner
 * when she is one, and the supporting faces, places and scenes all come from her franchise. One of
 * them, her included, leads the exercise with a scene of their own story. Otherwise the config's cast.
 * @param {{ name: string, voice?: string, partner?: boolean, world?: { franchise: string, supporting?: string[], places?: string[], lore?: Record<string, string[]> } } | null} persona
 * @param {{ leads?: string[], supporting?: string[] } | null} cast from btb.config.json
 * @param {() => number} [random] returns [0, 1)
 * @returns {{ leads: string[], supporting: string[], coach?: string, partner?: string, voice?: string, franchise?: string, places?: string[], featured?: string | null, scenes?: string[] } | null}
 */
export function castFor(persona, cast, random = Math.random) {
  const world = persona?.world;
  if (!world) return pickCast(cast, 3, random);
  const picked = pickCast({ leads: [persona.name], supporting: world.supporting }, 3, random);
  const lore = world.lore ?? {};
  const featured = pickFeatured([persona.name, ...picked.supporting], lore, random);
  return {
    ...picked,
    coach: persona.name,
    partner: persona.partner ? persona.name : undefined,
    voice: persona.voice,
    franchise: world.franchise,
    places: world.places ?? [],
    featured,
    scenes: featured ? drawFrom(lore[featured], 3, random) : [],
  };
}

// the scene comes first so the problem grows out of the lore, the romance only colors it
function sceneLines(cast) {
  if (!cast.featured || !cast.scenes?.length) return [];
  return [
    `- Each exercise is ${cast.featured}'s story. Set it inside one of these scenes from ${cast.featured}'s own story in ${cast.franchise}, a different one per exercise: ${cast.scenes.join("; ")}.`,
    `- ${cast.featured} brings the problem: the statement is told from that moment of their story, the learner solves it with them, and the inputs, the outputs and the rules are things that exist there and work the way they work in the games (items, stats, files, maps, mechanics). The title names the scene. Someone who played it should recognize it.`,
  ];
}

// only a partner shares the soft romance, any other coach of the day is an ally, whatever the theme says
function bondLine(cast) {
  if (cast.partner) {
    return `- ${cast.partner} is the learner's partner. The learner is the protagonist, spoken to as you, and the soft romance (love notes, dates, anniversaries, shared playlists) is only between ${cast.partner} and you, a touch on top of the scene, never the whole story.`;
  }
  return `- ${cast.coach} coaches the learner today as an ally, true to who they are in the games. The learner is the protagonist, spoken to as you. There is no romance with ${cast.coach} or anyone else in this exercise, whatever the theme says.`;
}

function worldLines(cast) {
  if (!cast.franchise) return [];
  const places = cast.places.length > 0 ? ` Places and things to draw from: ${cast.places.join(", ")}.` : "";
  return [
    ...sceneLines(cast),
    bondLine(cast),
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
