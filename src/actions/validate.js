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

/**
 * Lists what is wrong with an exercise draft before running anything.
 * @param {object} draft
 * @returns {string[]} empty when the shape is fine
 */
export function draftProblems(draft) {
  const problems = missingStrings(draft, ["title", "readme", "starter", "reference", "test"]);
  if (!isList(draft?.hints)) problems.push('"hints" must list at least one hint');
  if (!isList(draft?.concepts)) problems.push('"concepts" must list at least one concept');
  if (!(draft?.minutes > 0)) problems.push('"minutes" must be a positive number');
  return problems;
}

function levelProblems(level, number) {
  const problems = missingStrings(level, ["title", "summary"]);
  if (!isList(level?.concepts)) problems.push('"concepts" must not be empty');
  if (!Number.isInteger(level?.target) || level.target < 1) problems.push('"target" must be a positive integer');
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
  if (draft.levels.length < 3 || draft.levels.length > 12) problems.push("the path needs between 3 and 12 levels");
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
