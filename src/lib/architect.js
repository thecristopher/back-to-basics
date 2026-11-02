import { doneLevels, levelProgress } from "../actions/levels.js";
import { summarizeMastery } from "../actions/mastery.js";
import { normalizePath } from "../actions/path.js";
import { startFromPlacement } from "../actions/placement.js";
import { pathPrompt } from "../actions/prompts/path.js";
import { profilePrompt } from "../actions/prompts/profile.js";
import { describeRun } from "../actions/report.js";
import { pathProblems, profileProblems } from "../actions/validate.js";
import { askJson } from "./claude.js";
import { checkToolchain, loadProfile, saveProfile } from "./profiles.js";
import { runTests } from "./runner.js";
import { saveTrack } from "./tracks.js";

function otherTracks(ctx, track) {
  return ctx.catalog.tracks.filter((other) => other.id !== track.id).map((other) => ({ track: other, summary: summarizeMastery(ctx.state.mastery[other.id]) }));
}

async function askPath(ctx, prompt, kept) {
  const draft = await askJson(ctx.config.claude, prompt);
  const problems = pathProblems(draft, kept);
  if (problems.length === 0) return draft;
  const retry = await askJson(ctx.config.claude, `${prompt}\n\nYour previous answer had these problems, fix them:\n${problems.map((problem) => `- ${problem}`).join("\n")}`);
  const again = pathProblems(retry, kept);
  if (again.length > 0) throw new Error(`Claude drew an invalid path: ${again.join("; ")}`);
  return retry;
}

// a bundled track has its levels written by hand, the placement only says where the learner starts
async function placeOnAuthoredPath(ctx, track, placement) {
  const placed = placement.length > 0 || !track.path;
  const startLevel = placed ? startFromPlacement(placement, ctx.config.placementSize, track.levels.length, { fromBasics: ctx.config.fromBasics }) : track.path.startLevel;
  const revision = (track.path?.revision ?? 0) + 1;
  track.path = { rationale: ctx.t.authoredRationale(startLevel), startLevel, levels: track.levels, revision, drawnAt: ctx.today };
  await saveTrack(ctx.config, track);
  return track.path;
}

async function drawLearnedPath(ctx, track, placement) {
  const profile = await loadProfile(ctx.config, track.language);
  const progress = levelProgress(track, ctx.state.mastery[track.id]?.concepts);
  const kept = doneLevels(progress);
  const prompt = pathPrompt({
    track,
    profileName: profile.name,
    summary: summarizeMastery(ctx.state.mastery[track.id]),
    others: otherTracks(ctx, track),
    placement,
    kept: progress.slice(0, kept),
    language: ctx.config.language,
    fromBasics: ctx.config.fromBasics,
  });
  ctx.log(ctx.paint.dim(ctx.t.drawing(ctx.coach, track.title)));
  const draft = await askPath(ctx, prompt, kept);
  const revision = (track.path?.revision ?? 0) + 1;
  const drawn = normalizePath(draft, track.path, kept, { fromBasics: ctx.config.fromBasics, graph: track.graph });
  track.path = { ...drawn.path, revision, drawnAt: ctx.today };
  track.graph = drawn.graph;
  await saveTrack(ctx.config, track);
  return track.path;
}

/**
 * Sets the track's path. A bundled track places the learner on its authored levels; a learned language
 * has Claude draw the path from the evidence, or redraw what comes after the levels already done.
 * @param {object} ctx
 * @param {object} track mutated in place and saved
 * @param {{ placement?: object[] }} [evidence]
 * @returns {Promise<object>} the new path
 */
export async function drawPath(ctx, track, { placement = [] } = {}) {
  if (track.authored) return placeOnAuthoredPath(ctx, track, placement);
  return drawLearnedPath(ctx, track, placement);
}

/**
 * Asks Claude how to run tests in a language and saves it unapproved: its commands run only after btb setup --yes.
 * @param {object} ctx
 * @param {string} language as the learner typed it
 * @param {string} id the track id, the profile is saved under it
 * @param {string[]} [problems] what went wrong last time
 * @returns {Promise<object>} the saved profile
 */
export async function writeProfile(ctx, language, id, problems = []) {
  const prompt = profilePrompt({ language, platform: `${process.platform} ${process.arch}`, problems });
  ctx.log(ctx.paint.dim(ctx.t.learningLanguage(language)));
  let draft = await askJson(ctx.config.claude, prompt);
  let found = profileProblems(draft);
  if (found.length > 0) {
    draft = await askJson(ctx.config.claude, profilePrompt({ language, platform: process.platform, problems: found }));
    found = profileProblems(draft);
  }
  if (found.length > 0) throw new Error(`Claude wrote an invalid language profile: ${found.join("; ")}`);
  const profile = { ...draft, id, approved: false };
  await saveProfile(ctx.config, profile);
  return profile;
}

/**
 * Proves a profile works: the toolchain answers, the sample passes and the broken sample fails.
 * @param {object} ctx
 * @param {object} profile approved already
 * @returns {Promise<string[]>} problems, empty when it works
 */
export async function proveProfile(ctx, profile) {
  const toolchain = await checkToolchain(profile);
  if (!toolchain.ok) return [`"${toolchain.failed}" failed. Install: ${profile.install}`];
  const files = { solutionFile: profile.solutionFile, testFile: profile.testFile };
  const run = (solutionCode) => runTests({ config: ctx.config, profile, files, solutionCode, testCode: profile.sample.test, onInstall: ctx.onInstall });
  const good = await run(profile.sample.solution);
  if (!good.ok) return [describeRun("The sample solution must pass", good)];
  const broken = await run(profile.sample.broken);
  if (broken.ok) return ["The broken sample passes the tests, so a failing run is not detected"];
  return [];
}
