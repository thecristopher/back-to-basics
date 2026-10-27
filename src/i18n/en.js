/** English strings for the CLI. */
export default {
  help: `back-to-basics (btb): daily coding drills forged by Claude to fit you, graded by real tests

Usage: btb [command] [--json]

Practice
  today                 today's plan (default)
  next [--more]         opens the next exercise, Claude forges it when needed. --more adds a new one
  start <id>            opens a specific exercise
  submit [id]           runs the tests against your solution
  hint [id]             reveals the next hint, costs XP
  skip [id]             leave it for today, it comes back tomorrow
  reveal [id]           the reference solution, only after solving or skipping
  review [id]           Claude grades your solution, only after solving

Path
  placement [track]     placement test: Claude measures you and draws your path. --restart to take it again
  path [track]          the path Claude drew. --redraw to draw it again
  forge [track]         forge exercises ahead of time. --count=n
  learn <language>      a new track for any language. --goal="..." and --again
  setup [track] --yes   approve and install what a language needs

Progress
  status                levels, XP and streak
  plan                  your pace and when you reach your goals
  list                  everything forged and where you stand`,
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

  forging: (count, title) => `Claude is forging ${count === 1 ? "an exercise" : `${count} exercises`} of ${title} for you, and testing them...`,
  forgeFixing: (title) => `"${title}" failed its check, Claude is fixing it...`,
  forgeEmpty: "Claude could not forge a valid exercise this time. Try again in a moment.",
  forged: (count) => `${count} ${count === 1 ? "exercise" : "exercises"} ready for when you open them:`,
  installing: (name, dir) => `Installing what ${name} needs in ${dir}, only this once...`,
  drawing: (title) => `Claude is drawing your path in ${title}...`,
  noPlacementYet: (track) => `No path in ${track} yet. Claude draws one from the very basics; btb placement ${track} fits it to your real level.`,

  passed: (passed, total, title) => `✓ ${passed}/${total} tests pass. ${title}, solved.`,
  clean: "Clean",
  struggled: "Hard fought",
  timeTaken: (time, minutes, within) => `${time} ${within ? `(within ${minutes} min)` : `(target: ${minutes} min)`}`,
  mastered: "★ Mastered. It will not come back for review.",
  nextReviewOn: (date) => `Next review: ${date}`,
  levelUp: (level) => `Level ${level} passed. Claude adjusts what comes next with what you just showed.`,
  afterPass: "Next: btb next   Compare: btb reveal   Review: btb review",
  alreadySolved: (passed) => `✓ ${passed} tests pass. Already solved today, no extra XP.`,

  failedCount: (passed, total, attempt) => `✗ ${passed}/${total} tests pass (attempt ${attempt})`,
  yourConsole: "Your console:",
  timedOut: (seconds) => `✗ Took longer than ${seconds}s. A loop that never ends?`,
  crashed: "✗ Your solution did not load:",
  tsUnsupported: "✗ This Node version cannot run TypeScript. Use Node 22.6 or newer, or set flavor to js.",
  unapproved: (track) => `✗ The commands of ${track} are not approved yet. Review them with btb setup ${track}.`,
  afterFail: "Adjust and run btb submit again. Hint: btb hint   Not today: btb skip",
  afterFailPlacement: "Adjust and run btb submit again. If it will not come, btb skip, no shame.",

  hintHeader: (shown, total, cost) => `Hint ${shown} of ${total} (-${cost} XP)`,
  noMoreHints: "You have seen every hint. If it does not come today, btb skip and it returns tomorrow.",
  noHintsInPlacement: "No hints during placement. If you do not know, btb skip, nobody judges.",
  skipped: (date) => `Leaving it for today. It returns on ${date}.`,
  revealHint: "To see how it is solved: btb reveal",
  revealLocked: "The solution unlocks after solving or skipping it. Try first.",
  revealHeader: (title) => `Reference solution: ${title}`,

  reviewLocked: "The review comes after the tests pass.",
  reviewing: (title) => `Claude is reviewing ${title}, this can take a minute...`,

  placementIntro: (title) =>
    `${title} placement test. Claude forged probes that climb in difficulty, no hints.\n` +
    "Solve what you can. If one will not come, btb skip: it tells Claude where to start, it is not a judgment.",
  placementProgress: (answered, remaining) => `Placement: ${answered} answered, ${remaining} left`,
  placementLeft: (remaining) => `Placement: ${remaining} left. Continue with btb next.`,
  placementDone: "Placement done.",
  placementPending: "Your placement test is halfway. Continue with btb next.",
  placementBusy: (track) => `Your ${track} placement is halfway. Finish it or use --restart.`,
  placementHeading: "placement",

  pathMissing: (track) => `No path yet. btb placement ${track} so Claude draws it.`,
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
  firstTime: (track) => `First time? btb placement ${track}: Claude measures you in a few minutes and draws your path.`,
  slotTitle: "new, Claude forges it when you open it",
  goNext: "Next: btb next",
  allDone: (xp, goal) => `Done for today. ${xp}/${goal} XP.`,
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
  nothingForged: "No exercises yet. btb next and Claude forges the first one.",
};
