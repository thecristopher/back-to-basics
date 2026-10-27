import en from "../i18n/en.js";
import es from "../i18n/es.js";

const LOCALES = { en, es };

/**
 * The CLI strings for a language, English when it is not translated.
 * @param {string} language
 * @returns {typeof en}
 */
export function createT(language) {
  return LOCALES[language] ?? en;
}
