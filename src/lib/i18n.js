import en from "../i18n/en.js";
import es from "../i18n/es.js";
import { CLI_TEXTS } from "../i18n/voiced.js";

const LOCALES = { en, es };

// a voiced text keeps the shape of the one it replaces: a plain string, or a function of the same arguments
function voicedText(template, original, names) {
  if (typeof original !== "function") return template;
  return (...args) => template.replace(/\{(\w+)\}/g, (match, name) => (names.includes(name) ? String(args[names.indexOf(name)]) : match));
}

/**
 * The CLI strings for a language, English when it is not translated. A persona's texts in that
 * language replace the ones she voices.
 * @param {string} language
 * @param {{ texts?: Record<string, Record<string, string>> } | null} [persona]
 * @returns {typeof en}
 */
export function createT(language, persona = null) {
  const base = LOCALES[language] ?? en;
  const texts = Object.entries(persona?.texts?.[language] ?? {}).filter(([key]) => CLI_TEXTS[key]);
  if (texts.length === 0) return base;
  return { ...base, ...Object.fromEntries(texts.map(([key, template]) => [key, voicedText(template, base[key], CLI_TEXTS[key])])) };
}
