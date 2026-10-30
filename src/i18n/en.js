/** English strings for the CLI. */
export default {
  help: `back-to-basics (btb): daily coding drills forged by Claude to fit you, graded by real tests

Usage: btb [command] [--json]

Practice
  today                 today's plan (default)
  next [--more]         opens the next exercise, Claude forges it when needed. --more adds a new one
  start <id>            opens a specific exercise
  test [id]             runs the tests without counting an attempt
  submit [id]           runs the tests against your solution and records the round
  hint [id]             reveals the next hint, costs XP
  skip [id]             leave it for today, it comes back tomorrow
  reveal [id]           the reference solution, only after solving or skipping
  review [id]           Claude grades your solution, only after solving. --again for a new review
  greet                 your coach greets you with yesterday and today. --again for a new one
  debrief               your coach closes the day with how each exercise went
  prepare               gets your coach's day ready: her greeting and her lines for each exercise
  recall <id>           your coach answers what you remembered of its lesson's question. --answer="..."

Path
  placement [track]     placement test: Claude measures you and draws your path. --restart to take it again
  path [track]          the path Claude drew. --redraw to draw it again
  forge [track]         forge exercises ahead of time. --count=n, --lessons for missing lessons
  learn <language>      a new track for any language. --goal="..." and --again
  setup [track] --yes   approve and install what a language needs

Progress
  status                levels, XP and streak
  plan                  your pace and when you reach your goals
  list                  everything forged and where you stand

Lessons
  lessons [track]       every lesson, with your solution and Claude's review
  lesson [id]           the lesson behind an exercise
  brief [id]            the coach presents the lesson in their voice. --again for a new one
  redo <id>             solve it again from the starter, your solution stays. --fresh to restart
  submit <id> --redo    grades the redo, without touching your progress

Coach
  persona [name]        the coach in use, or another. list to see them all
  persona new <name>    Claude drafts a new coach. --from="who they are"
  --persona=<name>      any command with that coach, --persona=none for none`,
  unknownCommand: (name) => `Unknown command "${name}". Run btb help.`,
  noCurrent: "No exercise open. Run btb next.",
  unknownExercise: (id) => `Could not find exercise "${id}". Run btb list.`,
  unknownTrack: (id) => `There is no track "${id}". Yours are in btb path, or create one with btb learn ${id}.`,
  startNeedsId: "Which one? btb start <id>. Ids are in btb list.",
  notStarted: (slug) => `You have not opened ${slug} yet. Run btb start ${slug}.`,

  tagNew: "new",
  tagReview: "review",
  tagPlacement: "placement",
  level: (level) => `Level ${level}`,
  difficulty: (difficulty) => `difficulty ${difficulty}`,
  minutes: (minutes) => `~${minutes} min`,
  concepts: "Concepts",
  statement: "Statement",
  yourFile: "Your file",
  whenReady: "When ready: btb submit",

  forging: (who, count, title) => `${who} is forging ${count === 1 ? "an exercise" : `${count} exercises`} of ${title} for you, and testing them...`,
  forgeFixing: (who, title) => `"${title}" failed its check, ${who} is fixing it...`,
  forgeEmpty: (who) => `${who} could not forge a valid exercise this time. Try again in a moment.`,
  forged: (count) => `${count} ${count === 1 ? "exercise" : "exercises"} ready for when you open them:`,
  installing: (name, dir) => `Installing what ${name} needs in ${dir}, only this once...`,
  drawing: (who, title) => `${who} is drawing your path in ${title}...`,
  noPlacementYet: (who, track) => `No path in ${track} yet. ${who} draws one from the very basics; btb placement ${track} fits it to your real level.`,

  passed: (passed, total, title) => `✓ ${passed}/${total} tests pass. ${title}, solved.`,
  clean: "Clean",
  struggled: "Hard fought",
  timeTaken: (time, minutes, within) => `${time} ${within ? `(within ${minutes} min)` : `(target: ${minutes} min)`}`,
  mastered: "★ Mastered. It will not come back for review.",
  nextReviewOn: (date) => `Next review: ${date}`,
  levelUp: (who, level) => `Level ${level} passed. ${who} adjusts what comes next with what you just showed.`,
  afterPass: "Next: btb next   Compare: btb reveal   Review: btb review",
  alreadySolved: (passed) => `✓ ${passed} tests pass. Already solved today, no extra XP.`,

  trialPassed: (passed, total) => `✓ ${passed}/${total} tests pass. Nothing was recorded yet.`,
  trialFailed: (passed, total) => `✗ ${passed}/${total} tests pass (practice run, it does not count)`,
  trialAfterPass: "Record it with btb submit",
  failedCount: (passed, total, attempt) => `✗ ${passed}/${total} tests pass (attempt ${attempt})`,
  yourConsole: "Your console:",
  timedOut: (seconds) => `✗ Took longer than ${seconds}s. A loop that never ends?`,
  crashed: "✗ Your solution did not load:",
  tsUnsupported: "✗ This Node version cannot run TypeScript. Use Node 22.6 or newer, or set flavor to js.",
  unapproved: (track) => `✗ The commands of ${track} are not approved yet. Review them with btb setup ${track}.`,
  afterFail: "Adjust and run btb submit again. Hint: btb hint   Not today: btb skip",
  afterFailNoHints: "Adjust and run btb submit again. Not today: btb skip",
  afterFailPlacement: "Adjust and run btb submit again. If it will not come, btb skip, no shame.",

  hintHeader: (shown, total, cost) => `Hint ${shown} of ${total} (-${cost} XP)`,
  noMoreHints: "You have seen every hint. If it does not come today, btb skip and it returns tomorrow.",
  noHintsInPlacement: "No hints during placement. If you do not know, btb skip, nobody judges.",
  skipped: (date) => `Leaving it for today. It returns on ${date}.`,
  revealHint: "To see how it is solved: btb reveal",
  revealLocked: "The solution unlocks after solving or skipping it. Try first.",
  revealHeader: (title) => `Reference solution: ${title}`,

  reviewLocked: "The review comes after the tests pass.",
  preparingGreet: (who) => `${who} is getting your day ready...`,
  preparingDebrief: (who) => `${who} is going over how today went...`,
  recalling: (who, title) => `${who} is reading what you remembered of "${title}"...`,
  noRecallQuestion: (id) => `The lesson of ${id} leaves no question to remember.`,
  reviewing: (who, title) => `${who} is reviewing ${title}, this can take a minute...`,

  placementIntro: (who, title) =>
    `${title} placement test. ${who} forged probes that climb in difficulty, no hints.\n` +
    `Solve what you can. If one will not come, btb skip: it tells ${who} where to start, it is not a judgment.`,
  placementProgress: (answered, remaining) => `Placement: ${answered} answered, ${remaining} left`,
  placementLeft: (remaining) => `Placement: ${remaining} left. Continue with btb next.`,
  placementDone: "Placement done.",
  placementPending: "Your placement test is halfway. Continue with btb next.",
  placementBusy: (track) => `Your ${track} placement is halfway. Finish it or use --restart.`,
  placementHeading: "placement",

  trackLocked: (title, lock) =>
    lock.needed === null
      ? `${title} opens once you move through ${lock.title}. Start with btb placement ${lock.track}.`
      : `${title} opens after ${lock.needed} levels of ${lock.title}, ${lock.done} done so far.`,
  pathMissing: (who, track) => `No path yet. btb placement ${track} so ${who} draws it.`,
  startsAt: (title, level, levelTitle) => `${title}: you start at level ${level}, ${levelTitle}`,
  seePath: (track) => `The whole path: btb path ${track}`,
  revision: (revision, date) => `drawing ${revision}, ${date}`,
  cleanOf: (clean, target) => `${clean}/${target} clean`,

  learningLanguage: (language) => `Claude is working out how to run ${language} tests on your machine...`,
  learnNeedsName: "Which language? btb learn rust",
  trackExists: (id) => `You already have the ${id} track. To redo its profile: btb learn ${id} --again`,
  defaultFocus: (name) => `${name} from the basics up to big tech interview level, by hand.`,
  learned: (name, id) => `New track: ${name} (${id}).`,
  learnApprove: (id) => `If you trust these commands: btb setup ${id} --yes`,
  learnReady: (id) => `Ready. Let Claude place you: btb placement ${id}`,
  learnAgain: (id) => `To have Claude redo the profile with these errors: btb learn ${id} --again`,
  reviewCommands: "Claude proposes running these commands on your machine:",
  checkLabel: "check",
  testLabel: "tests",
  installLabel: "To install it",
  setupFailed: (name) => `${name} does not run yet:`,
  setupDone: (name) => `${name} runs fine on your machine.`,

  todayHeader: (date) => `Today, ${date}`,
  streak: (days) => (days === 1 ? "1 day streak" : `${days} day streak`),
  xpToday: (xp, goal) => `XP ${xp}/${goal}`,
  firstTime: (who, track) => `First time? btb placement ${track}: ${who} measures you in a few minutes and draws your path.`,
  slotTitle: (who) => `new, ${who} forges it when you open it`,
  goNext: "Next: btb next",
  allDone: (xp, goal) => `Done for today! ${xp}/${goal} XP.`,
  summarySolved: (solved, clean, struggled) => `Solved: ${solved} (${clean} clean, ${struggled} hard fought)`,
  summaryMisses: (skipped, failures, hints) => `Skipped: ${skipped}   Failed submits: ${failures}   Hints: ${hints}`,
  summaryRecapped: (count) => `You recapped ${count} ${count === 1 ? "exercise" : "exercises"} from earlier days.`,
  summaryImprove: (concepts) => `Worth another look: ${concepts.join(", ")}`,
  summaryAllClean: "Nothing to shore up today, all clean.",
  recapHeader: "Recap of what you already fought",
  recapBack: (date) => `back on ${date}`,
  moreHint: "Hungry for more? btb next --more",

  totals: (xp, streak, solved, mastered) => `Total XP ${xp}   streak ${streak}   solved ${solved}   mastered ${mastered}`,
  placedOut: "placed above",
  planHeader: "Your path",
  pace: (dailyNew, daysPerWeek, tracks) => `Pace: ${dailyNew} new per session across ${tracks} ${tracks === 1 ? "track" : "tracks"}, ${daysPerWeek} days a week`,
  readyBy: (date) => `ready by ${date}`,
  goalsHeader: "Goals",
  noGoals: "No goals yet. Add them under goals in btb.config.json.",
  goalDone: "✓ done",
  goalOnTrack: "✓ on track",
  goalBehind: "✗ behind",
  goalUnknown: "? that level is not on the path",
  by: (date) => `by ${date}`,
  projected: (date) => `(projected ${date})`,
  legend: "★ mastered   ↻ due for review   ✓ solved   ~ started   · new",
  nothingForged: (who) => `No exercises yet. btb next and ${who} forges the first one.`,

  summoning: (character) => `Claude is summoning ${character} as your coach for today, only this once...`,
  unknownPersona: (name) => `There is no persona "${name}". Run btb persona list.`,
  personasHeader: "Coaches",
  personaHowTo: 'Pick one with "persona" in btb.config.json, or draft one with btb persona new <name> --from="..."',
  personaSample: "Says",
  personaBadName: "The name of a persona is lowercase letters, digits and hyphens, like claire or my-coach.",
  personaNeedsFrom: 'Tell Claude who the coach is: btb persona new <name> --from="..."',
  personaExists: (name) => `There is already a persona "${name}". Pick another name.`,
  draftingPersona: (name) => `Claude is drafting ${name}...`,
  personaInvalid: (problems) => `Claude's draft did not hold: ${problems.join("; ")}. Run it again.`,
  personaSaved: (file, name) => `Saved in ${file}. Read it, tweak it, and set "persona": "${name}" in btb.config.json to use it.`,

  noLesson: (id) => `${id} has no lesson yet. Run btb forge --lessons.`,
  hasLesson: "lesson",
  hasReview: "review",
  lessonsHowTo: "Read one with btb lesson <id>, its review with btb review <id>, solve it again with btb redo <id>",
  briefing: (name, title) => `${name} is getting "${title}" ready for you...`,
  writingLesson: (who, title) => `${who} is writing the lesson of "${title}"...`,
  lessonsComplete: "Every exercise already has its lesson.",
  lessonsWritten: (count) => `${count} ${count === 1 ? "lesson written" : "lessons written"}:`,
  writingMoments: (who, title) => `${who} is writing what you will hear in "${title}"...`,
  momentsWritten: (who, count) => `${count} ${count === 1 ? "exercise" : "exercises"} where ${who} now talks about what you are fighting:`,
  redoNeedsId: "Which one? btb redo <id>, they are in btb lessons.",
  redoLocked: "Solve it or skip it first, a redo is for coming back.",
  redoHeader: (title) => `Redo: ${title}. Your first solution stays where it was.`,
  redoHowTo: (id) => `When it is ready: btb submit ${id} --redo`,
  redoNotStarted: (id) => `There is no redo of ${id}. Run btb redo ${id}.`,
  redoPassed: (passed, total, title) => `✓ ${passed}/${total} tests pass. ${title}, solved again.`,
  redoGhost: (verdict, time, ghost) =>
    ({ ahead: `You beat your ghost: ${time} against ${ghost}.`, behind: `Your ghost is still ahead: ${time} against ${ghost}.`, tied: `Tied with your ghost: ${time}.` })[verdict],
  afterFailRedo: (id) => `Adjust and run btb submit ${id} --redo again.`,
  finishFirst: "Finish this one first, or give up with btb skip. Then we move on to the next.",
};
