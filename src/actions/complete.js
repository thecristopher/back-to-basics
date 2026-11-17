import { bar, duration } from "../utils/text.js";

// blocks of a lesson that are not prose: headings, code, lists, quotes and tables
const NOT_PROSE = /^(#|```|[-*] |\d+\. |>|\|)/;

function firstParagraph(markdown) {
  if (typeof markdown !== "string") return null;
  const blocks = markdown.split(/\n\s*\n/).map((block) => block.trim());
  const prose = blocks.find((block) => block !== "" && !NOT_PROSE.test(block));
  return prose ? prose.replace(/\s*\n\s*/g, " ") : null;
}

/**
 * The real lesson a pass leaves behind: the one the exercise was forged with, or the opening
 * paragraph of its lesson for exercises forged before takeaways existed.
 * @param {{ takeaway?: string } | undefined} exercise
 * @param {string | null} lesson the lesson's markdown
 * @returns {string | null} null when there is nothing to take away
 */
export function takeawayOf(exercise, lesson) {
  const own = typeof exercise?.takeaway === "string" ? exercise.takeaway.trim() : "";
  return own !== "" ? own : firstParagraph(lesson);
}

/**
 * How many of the round's submits passed, as a percentage: the last one always did.
 * @param {{ failures?: number }} round
 * @returns {number} 100 for a first try, lower with every failed submit
 */
export function accuracyOf(round) {
  return Math.round(100 / ((round?.failures ?? 0) + 1));
}

/**
 * Cuts a sentence into lines of at most width characters, never in the middle of a word.
 * @param {string} text
 * @param {number} [width]
 * @returns {string[]}
 */
export function wrapWords(text, width = 60) {
  const lines = [];
  let current = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = current === "" ? word : `${current} ${word}`;
    if (next.length > width && current !== "") {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current !== "") lines.push(current);
  return lines;
}

/**
 * How long the lesson took: the real work the editor measured, or the clock when nothing was measured.
 * @param {object} t texts
 * @param {{ seconds: number | null, activeSeconds?: number | null, minutes: number }} data
 * @returns {string} empty when nothing was timed
 */
export function workedTime(t, data) {
  const worked = data.activeSeconds || data.seconds;
  if (!Number.isFinite(worked)) return "";
  return t.timeTaken(duration(worked), data.minutes, worked <= data.minutes * 60);
}

function goalLine(t, data) {
  if (!(data.dailyGoal > 0)) return [];
  if (data.dayXp >= data.dailyGoal) return [t.dailyGoalMet(bar(1, 1), data.dayXp, data.dailyGoal)];
  return [t.dailyGoal(bar(data.dayXp, data.dailyGoal), data.dayXp, data.dailyGoal)];
}

function statsLine(t, data) {
  const stats = [`+${data.xp} XP`, t.accuracy(data.accuracy)];
  if (data.hints > 0) stats.push(t.hintsUsed(data.hints));
  if (data.streak > 0) stats.push(t.streakCount(data.streak));
  return stats.join("   ");
}

function learnedLines({ t, paint }, takeaway) {
  if (!takeaway) return [];
  return ["", paint.bold(t.whatYouLearned), ...wrapWords(takeaway).map((line) => `  ${line}`)];
}

/**
 * The question that closes the lesson, asked right after the card, and how to answer it.
 * @param {{ t: object, paint: object }} ctx
 * @param {{ id: string, question?: string | null }} data
 * @returns {string[]} empty when the lesson asks nothing
 */
export function closingLines({ t, paint }, data) {
  if (!data.question) return [];
  return ["", paint.bold(t.closingQuestion), ...wrapWords(data.question).map((line) => `  ${line}`), paint.dim(t.answerClosing(data.id))];
}

/**
 * The level up, on a block of its own after the lesson instead of a line lost under it.
 * @param {{ t: object, paint: object }} ctx
 * @param {{ levelUp?: number | null }} data
 * @param {string} who the coach's name
 * @returns {string[]} empty when the pass did not level up
 */
export function levelUpLines({ t, paint }, data, who) {
  if (!data.levelUp) return [];
  return ["", paint.green(paint.bold(t.levelUpBanner(data.levelUp))), t.levelUp(who)];
}

/**
 * The card that closes a lesson the moment its tests pass: the result, the numbers and what it taught.
 * @param {{ t: object, paint: object }} ctx
 * @param {{ title: string, passed: number, total: number, outcome: string, xp: number, accuracy: number, hints: number, streak: number, takeaway: string | null, seconds: number | null, activeSeconds?: number | null, minutes: number, dayXp?: number, dailyGoal?: number }} data
 * @returns {string[]}
 */
export function lessonCard({ t, paint }, data) {
  const outcome = data.outcome === "clean" ? paint.green(t.clean) : paint.yellow(t.struggled);
  const time = workedTime(t, data);
  return [
    paint.green(paint.bold(t.lessonComplete)),
    `${data.title} · ${t.testsPassed(data.passed, data.total)} · ${outcome}`,
    statsLine(t, data),
    ...(time ? [paint.dim(time)] : []),
    ...goalLine(t, data).map((line) => paint.cyan(line)),
    ...learnedLines({ t, paint }, data.takeaway),
  ];
}
