const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const FILE_NAME = /^[A-Za-z0-9_.-]+$/;
const LEARNED_REPORTS = ["tap", "exit-code"];

function missingStrings(object, keys) {
  return keys
    .filter((key) => typeof object?.[key] !== "string" || object[key].trim() === "")
    .map((key) => `"${key}" must be a non empty string`);
}

function isList(value) {
  return Array.isArray(value) && value.length > 0;
}

function isCommand(value) {
  return isList(value) && value.every((part) => typeof part === "string");
}

// with a graph in hand, an exercise may only name concepts from it and must teach the one it was asked for
function conceptIdProblems(concepts, { allowed, primary }) {
  if (!allowed) return [];
  const unknown = concepts.filter((id) => !allowed.includes(id));
  const problems = unknown.length > 0 ? [`"concepts" must only use these ids: ${allowed.join(", ")}. Unknown: ${unknown.join(", ")}`] : [];
  if (primary && concepts[0] !== primary) problems.push(`"concepts" must start with "${primary}", the concept this exercise teaches`);
  return problems;
}

/**
 * Lists what is wrong with an exercise draft before running anything.
 * @param {object} draft
 * @param {{ preview?: boolean, allowed?: string[], primary?: string | null }} [needs] preview when the language shows the
 *   component in the browser, allowed the concept ids the exercise may use and primary the one it must teach
 * @returns {string[]} empty when the shape is fine
 */
export function draftProblems(draft, needs = {}) {
  const keys = ["title", "readme", "lesson", "starter", "reference", "test", ...(needs.preview ? ["preview"] : [])];
  const problems = missingStrings(draft, keys);
  if (!isList(draft?.hints)) problems.push('"hints" must list at least one hint');
  if (!isList(draft?.concepts)) problems.push('"concepts" must list at least one concept');
  else problems.push(...conceptIdProblems(draft.concepts.map(String), needs));
  if (!(draft?.minutes > 0)) problems.push('"minutes" must be a positive number');
  return problems;
}

function pathConceptProblems(concept) {
  if (typeof concept?.id !== "string" || !SLUG.test(concept.id)) return [`concept "${concept?.id ?? concept}" needs a kebab case "id"`];
  return missingStrings(concept, ["title"]).map((problem) => `concept "${concept.id}": ${problem}`);
}

function levelProblems(level, number) {
  const problems = missingStrings(level, ["title", "summary"]);
  if (!isList(level?.concepts) || level.concepts.length > 6) problems.push('"concepts" must list 1 to 6 concepts');
  else problems.push(...level.concepts.flatMap(pathConceptProblems));
  return problems.map((problem) => `level ${number}: ${problem}`);
}

/**
 * Lists what is wrong with a drawn path.
 * @param {object} draft
 * @param {number} kept levels already done that the path must still start with
 * @returns {string[]}
 */
export function pathProblems(draft, kept = 0) {
  if (!Array.isArray(draft?.levels)) return ['"levels" must be an array'];
  const problems = draft.levels.flatMap((level, index) => levelProblems(level, index + 1));
  if (draft.levels.length < 3 || draft.levels.length > 14) problems.push("the path needs between 3 and 14 levels");
  if (draft.levels.length <= kept) problems.push(`the path must go past the ${kept} levels already done`);
  const start = draft.startLevel;
  if (!Number.isInteger(start) || start < 1 || start > draft.levels.length) problems.push('"startLevel" must point at one of the levels');
  return problems;
}

/**
 * Lists what is wrong with a language profile Claude wrote.
 * @param {object} draft
 * @returns {string[]}
 */
export function profileProblems(draft) {
  const problems = missingStrings(draft, ["id", "name", "solutionFile", "testFile", "importHint", "testGuide", "install"]);
  if (draft?.id && !SLUG.test(draft.id)) problems.push('"id" must be kebab case');
  for (const key of ["solutionFile", "testFile"]) {
    if (draft?.[key] && !FILE_NAME.test(draft[key])) problems.push(`"${key}" must be a plain file name`);
  }
  if (!isCommand(draft?.test)) problems.push('"test" must be a command, an array of strings');
  if (!isList(draft?.check) || !draft.check.every(isCommand)) problems.push('"check" must be a list of commands');
  if (!LEARNED_REPORTS.includes(draft?.report)) problems.push(`"report" must be one of: ${LEARNED_REPORTS.join(", ")}`);
  problems.push(...missingStrings(draft?.sample, ["solution", "broken", "test"]).map((problem) => `sample: ${problem}`));
  return problems;
}
