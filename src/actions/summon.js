/**
 * The world a summoned coach borrows from the partner who lives in the same franchise: the partner
 * joins the supporting cast, the coach leaves it, and every scene stays with whoever it belongs to.
 * @param {{ name: string, world: { franchise: string, supporting?: string[], places?: string[], lore?: Record<string, string[]> } } | null} partner
 * @param {string} character the coach being summoned
 * @param {string} franchise
 * @param {string[] | undefined} drafted scenes of the coach's own story Claude wrote, used when the world has none
 * @returns {{ franchise: string, supporting: string[], places: string[], lore: Record<string, string[]> }}
 */
export function borrowedWorld(partner, character, franchise, drafted) {
  const world = partner?.world ?? { franchise };
  const supporting = [partner?.name, ...(world.supporting ?? [])].filter((name) => name && name !== character);
  const lore = Object.fromEntries(Object.entries(world.lore ?? {}).filter(([name]) => supporting.includes(name)));
  const own = world.lore?.[character] ?? (drafted ?? []).filter((scene) => typeof scene === "string" && scene.trim() !== "");
  if (own.length > 0) lore[character] = own;
  return { franchise, supporting, places: world.places ?? [], lore };
}

/**
 * The persona file of a summoned coach, named exactly like the character so the editor finds it again.
 * @param {{ voice: string, lines: object, texts?: object }} draft what Claude wrote
 * @param {{ character: string, franchise: string }} who
 * @param {object} world from borrowedWorld
 * @returns {object}
 */
export function summonedPersona(draft, { character, franchise }, world) {
  return { name: character, voice: draft.voice, summoned: { franchise }, world, lines: draft.lines, texts: draft.texts };
}
