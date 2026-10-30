/**
 * The CLI texts a persona may say in her own voice, with the placeholders each one is filled with,
 * in the order the text's function takes them.
 */
export const CLI_TEXTS = {
  todayHeader: ["date"],
  recapHeader: [],
  goNext: [],
  moreHint: [],
  whenReady: [],
  afterPass: [],
  afterFail: [],
  afterFailNoHints: [],
  timedOut: ["seconds"],
  noMoreHints: [],
  skipped: ["date"],
  mastered: [],
  nextReviewOn: ["date"],
  revealLocked: [],
  reviewLocked: [],
  finishFirst: [],
  allDone: ["xp", "goal"],
  summaryAllClean: [],
};

/** The Neovim plugin's texts a persona may say, plain strings with no placeholders, and what each one is for. */
export const EDITOR_TEXTS = {
  still_opening: "a second command arrived while the exercise is still being prepared",
  working: "waiting on any command",
  working_today: "checking the day's plan",
  working_next: "getting the next exercise ready",
  working_placement: "getting the placement test ready",
  working_submit: "running the tests that count",
  working_test: "trying the tests on save, nothing is recorded",
  working_brief: "the coach prepares the lesson",
  working_review: "the coach reviews the solution",
  working_recall: "the coach reads what they remembered",
  working_greet: "the coach prepares the day",
  working_debrief: "the coach goes over how the day went",
  working_lessons: "opening the lesson library",
  ready: "a wait just ended well",
  coach_on: "the coach was turned back on",
  coach_off: "the coach was silenced",
  stage_start: "the briefing is over, press <CR> to open the exercise",
  recall_prompt: "label of the box where they type an answer from memory",
  recall_header: "heading over the answers they gave from memory",
  recall_blank: "shown when they left an answer blank",
};

/**
 * The placeholders a voiced text may carry, null when the text cannot be voiced.
 * @param {string} key
 * @returns {string[] | null}
 */
export function placeholdersOf(key) {
  if (CLI_TEXTS[key]) return CLI_TEXTS[key];
  return EDITOR_TEXTS[key] ? [] : null;
}
