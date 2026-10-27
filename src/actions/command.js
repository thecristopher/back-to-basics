/**
 * Fills {placeholders} in a command with their values. Unknown ones are left as they are.
 * @param {string[]} command e.g. ["{node}", "{test}"]
 * @param {Record<string, string>} vars
 * @returns {string[]}
 */
export function expandCommand(command, vars) {
  return command.map((part) => part.replace(/\{(\w+)\}/g, (match, name) => vars[name] ?? match));
}
