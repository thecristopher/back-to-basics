const STRIP_FLAG = "--experimental-strip-types";

/**
 * Node flags needed to run a TypeScript solution, by Node version.
 * Node 22.18+ and 23.6+ strip types on their own, 22.6+ needs the flag.
 * @param {string} version e.g. "22.22.0"
 * @returns {string[] | null} null when this Node cannot run TypeScript
 */
export function typeScriptFlags(version) {
  const [major, minor] = version.split(".").map(Number);
  if (major >= 24) return [];
  if (major === 23) return minor >= 6 ? [] : [STRIP_FLAG];
  if (major === 22 && minor >= 18) return [];
  if (major === 22 && minor >= 6) return [STRIP_FLAG];
  return null;
}
