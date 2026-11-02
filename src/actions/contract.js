/**
 * The small part of JSON Schema btb's contracts use: type, const, enum, required, properties and items.
 * Enough to check that --json keeps its promises to the editors, with no dependency.
 */

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

function fitsType(value, type) {
  const types = Array.isArray(type) ? type : [type];
  const actual = typeOf(value);
  return types.some((expected) => expected === actual || (expected === "number" && actual === "integer"));
}

function valueProblems(schema, value, at) {
  if ("const" in schema && value !== schema.const) return [`${at} must be ${JSON.stringify(schema.const)}`];
  if (schema.enum && !schema.enum.includes(value)) return [`${at} must be one of ${schema.enum.join(", ")}, got ${JSON.stringify(value)}`];
  if (schema.type && !fitsType(value, schema.type)) return [`${at} must be ${[schema.type].flat().join(" or ")}, got ${typeOf(value)}`];
  return [];
}

function objectProblems(schema, value, at) {
  const missing = (schema.required ?? []).filter((key) => !(key in value)).map((key) => `${at}.${key} is missing`);
  const nested = Object.entries(schema.properties ?? {})
    .filter(([key]) => key in value)
    .flatMap(([key, child]) => contractProblems(child, value[key], `${at}.${key}`));
  return [...missing, ...nested];
}

/**
 * Lists where a value breaks a contract, empty when it keeps it. Keys the contract does not name are allowed,
 * so btb can add fields without breaking an editor.
 * @param {object} schema a contract from contracts/
 * @param {unknown} value
 * @param {string} [at] where the value sits, for the messages
 * @returns {string[]}
 */
export function contractProblems(schema, value, at = "$") {
  const own = valueProblems(schema, value, at);
  if (own.length > 0) return own;
  if (typeOf(value) === "object") return objectProblems(schema, value, at);
  if (typeOf(value) === "array" && schema.items) return value.flatMap((item, index) => contractProblems(schema.items, item, `${at}[${index}]`));
  return [];
}
