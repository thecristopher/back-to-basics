/**
 * Turns any text into a kebab case slug: "Mi Botón!" becomes "mi-boton".
 * @param {string} text
 * @returns {string}
 */
export function toSlug(text) {
  const slug = String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "exercise";
}

/**
 * A slug not in use yet, adding -2, -3... when it is taken.
 * @param {string} slug
 * @param {Set<string>} taken
 * @returns {string}
 */
export function uniqueSlug(slug, taken) {
  if (!taken.has(slug)) return slug;
  let count = 2;
  while (taken.has(`${slug}-${count}`)) count += 1;
  return `${slug}-${count}`;
}
