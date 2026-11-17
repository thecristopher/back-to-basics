/**
 * What relations.json in the data folder adds to one coach. A key may end in * to reach every coach
 * whose id starts with it (elizabeth-* covers each role she plays), an exact id wins over it.
 * @param {Record<string, { voice?: string, guests?: Record<string, string> }> | null} relations
 * @param {string} id the persona's id
 * @returns {{ voice?: string, guests?: Record<string, string> } | null}
 */
export function relationFor(relations, id) {
  if (!relations || typeof relations !== "object") return null;
  if (relations[id]) return relations[id];
  const key = Object.keys(relations).find((name) => name.endsWith("*") && id.startsWith(name.slice(0, -1)));
  return key ? relations[key] : null;
}

function guestsOf(relation) {
  const guests = relation.guests;
  if (!guests || typeof guests !== "object") return {};
  return Object.fromEntries(Object.entries(guests).filter(([name, note]) => name.trim() !== "" && typeof note === "string"));
}

/**
 * The coach with what the learner's own relations add: more of how they feel about the learner in
 * their voice, and the guests who may drop into their exercises. Never saved back to the persona file.
 * @param {object} persona
 * @param {{ voice?: string, guests?: Record<string, string> } | null} relation
 * @returns {object}
 */
export function withRelation(persona, relation) {
  if (!relation) return persona;
  const extra = typeof relation.voice === "string" ? relation.voice.trim() : "";
  const guests = guestsOf(relation);
  return {
    ...persona,
    ...(extra ? { voice: `${persona.voice} ${extra}` } : {}),
    ...(Object.keys(guests).length > 0 ? { guests } : {}),
  };
}
