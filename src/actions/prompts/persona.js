import en from "../../i18n/en.js";
import { CLI_TEXTS, EDITOR_TEXTS } from "../../i18n/voiced.js";
import { MOMENTS } from "../persona.js";
import { languageName } from "./evidence.js";

const MEANING = {
  greet: "the learner opens today's plan",
  ready: "an exercise was just opened",
  failed: "the tests failed for the first time this round",
  failed_again: "the tests failed again in the same round",
  passed_clean: "the tests passed with no hints and almost no failures",
  passed_struggled: "the tests passed after hints or several failures",
  hint: "the learner asked for a hint",
  skip: "the learner left the exercise for tomorrow",
  level_up: "the learner just passed a level",
  debrief: "everything for today is done",
};

// each text the coach may voice, with what the tool says there today so the draft keeps its meaning
function textGuide() {
  const cli = Object.entries(CLI_TEXTS).map(([key, names]) => {
    const original = typeof en[key] === "function" ? en[key](...names.map((name) => `{${name}}`)) : en[key];
    return `- ${key}: today says "${original}"`;
  });
  const editor = Object.entries(EDITOR_TEXTS).map(([key, meaning]) => `- ${key}: ${meaning}`);
  return [...cli, ...editor];
}

// a character summoned from a franchise stays true to the games and leaves the romance to the partners
function summonLines(summon) {
  if (!summon) return [];
  const partners = summon.partners.length > 0 ? `: that bond belongs to ${summon.partners.join(", ")} only` : "";
  return [
    `- The coach is ${summon.character} from ${summon.franchise}, true to who they are in the games: their temperament, the way they talk, their history and the people around them.`,
    `- ${summon.character} is an ally who trains the learner, never a romance${partners}.`,
    `- voice also says how ${summon.character} treats the learner, and that there is no romance.`,
    `- lore lists 3 or 4 scenes from ${summon.character}'s own story in ${summon.franchise}, each one a moment or mechanic of the games an exercise could be set in.`,
  ];
}

/**
 * The prompt that asks Claude to draft a coach persona from a description, or to summon a
 * character of a franchise as the coach of the day.
 * @param {{ description: string, language: string, summon?: { character: string, franchise: string, partners: string[] } }} input
 * @returns {string}
 */
export function personaPrompt({ description, language, summon }) {
  const lines = Object.fromEntries(MOMENTS.map((moment) => [moment, ["line", "line", "line"]]));
  const texts = Object.fromEntries([...Object.keys(CLI_TEXTS), ...Object.keys(EDITOR_TEXTS)].map((key) => [key, "text"]));
  const shape = { name: "display name", voice: "how the coach talks, two or three sentences", lines: { [language]: lines }, texts: { [language]: texts } };
  const schema = JSON.stringify(summon ? { ...shape, lore: ["scene", "scene", "scene"] } : shape);
  return [
    "BTB_TASK: persona",
    "back-to-basics is a daily drill where someone rebuilds their programming fundamentals by hand, with no AI while solving.",
    "Draft the coach that keeps them company. The coach reacts to what happens, encourages, and never solves anything for them.",
    "",
    `Who the coach is: ${description}`,
    "",
    "Rules:",
    ...summonLines(summon),
    `- Write every line in ${languageName(language)}, short, one or two sentences, in the coach's own voice.`,
    "- Original lines only, never quotes from games, films or books.",
    "- Never mention code that solves the exercise, never insult the learner.",
    "- voice is written in English, it is read by the model that writes reviews in this voice.",
    "- Lines may use {title} (the exercise), {xp} (XP earned), {time} (how long it took) and {level} (the level just passed) where they fit, mostly in passed_clean, passed_struggled and level_up. A line that offers a hint must carry {hints} (hints left), so it is only said when there is one to give. Keep at least one line per moment without placeholders.",
    "- Never use em dashes.",
    "",
    "When each line is said:",
    ...MOMENTS.map((moment) => `- ${moment}: ${MEANING[moment]}`),
    "",
    "texts are the tool's own messages said in the coach's voice and personality, short like the originals.",
    "Keep every btb command, key like <CR> and placeholder like {date} exactly as they are, never add a placeholder the original lacks.",
    ...textGuide(),
    "",
    "Respond with JSON only, no prose and no code fences, in this shape:",
    schema,
  ].join("\n");
}
