/** Spanish strings for the CLI. */
export default {
  help: `back-to-basics (btb): práctica diaria de código, forjada por Claude a tu medida y calificada por tests reales

Uso: btb [comando] [--json]

Práctica
  today                 el plan de hoy (por defecto)
  next [--more]         abre el siguiente ejercicio, Claude lo forja si hace falta. --more agrega uno nuevo
  start <id>            abre un ejercicio en particular
  submit [id]           corre los tests sobre tu solución
  hint [id]             revela la siguiente pista, cuesta XP
  skip [id]             lo dejas por hoy y regresa mañana
  reveal [id]           la solución de referencia, solo después de resolver o saltar
  review [id]           Claude califica tu solución, solo después de resolver

Camino
  placement [pista]     examen de ubicación: Claude te mide y traza tu camino. --restart para repetirlo
  path [pista]          el camino que trazó Claude. --redraw para trazarlo de nuevo
  forge [pista]         forja ejercicios por adelantado. --count=n
  learn <lenguaje>      una pista nueva para cualquier lenguaje. --goal="..." y --again
  setup [pista] --yes   aprueba e instala lo que necesita un lenguaje

Progreso
  status                niveles, XP y racha
  plan                  tu ritmo y cuándo llegas a tus metas
  list                  todo lo forjado y cómo vas en cada uno`,
  unknownCommand: (name) => `No conozco el comando "${name}". Corre btb help.`,
  noCurrent: "No hay ejercicio abierto. Corre btb next.",
  unknownExercise: (id) => `No encontré el ejercicio "${id}". Corre btb list.`,
  unknownTrack: (id) => `No hay una pista "${id}". Las tuyas salen en btb path, o crea una con btb learn ${id}.`,
  startNeedsId: "Dime cuál: btb start <id>. Los ids están en btb list.",
  notStarted: (slug) => `Aún no abres ${slug}. Corre btb start ${slug}.`,

  tagNew: "nuevo",
  tagReview: "repaso",
  tagPlacement: "ubicación",
  level: (level) => `Nivel ${level}`,
  difficulty: (difficulty) => `dificultad ${difficulty}`,
  minutes: (minutes) => `~${minutes} min`,
  concepts: "Conceptos",
  statement: "Enunciado",
  yourFile: "Tu archivo",
  whenReady: "Cuando esté listo: btb submit",

  forging: (count, title) => `Claude está forjando ${count === 1 ? "un ejercicio" : `${count} ejercicios`} de ${title} a tu medida, y los pone a prueba...`,
  forgeFixing: (title) => `"${title}" no pasó la prueba, Claude lo está corrigiendo...`,
  forgeEmpty: "Claude no logró forjar un ejercicio válido esta vez. Intenta de nuevo en un momento.",
  forged: (count) => `${count} ${count === 1 ? "ejercicio listo" : "ejercicios listos"} para cuando los abras:`,
  installing: (name, dir) => `Instalando lo que necesita ${name} en ${dir}, solo esta vez...`,
  drawing: (title) => `Claude está trazando tu camino en ${title}...`,
  noPlacementYet: (track) => `Aún no hay camino en ${track}. Claude traza uno desde el nivel más básico; btb placement ${track} lo ajusta a tu nivel real.`,

  passed: (passed, total, title) => `✓ ${passed}/${total} tests pasan. ${title}, resuelto.`,
  clean: "Limpio",
  struggled: "Con batalla",
  timeTaken: (time, minutes, within) => `${time} ${within ? `(dentro de ${minutes} min)` : `(meta: ${minutes} min)`}`,
  mastered: "★ Dominado. Ya no vuelve a repaso.",
  nextReviewOn: (date) => `Próximo repaso: ${date}`,
  levelUp: (level) => `Nivel ${level} superado. Claude ajusta lo que sigue con lo que acabas de mostrar.`,
  afterPass: "Sigue: btb next   Compara: btb reveal   Revisión: btb review",
  alreadySolved: (passed) => `✓ ${passed} tests pasan. Ya lo resolviste hoy, sin XP extra.`,

  failedCount: (passed, total, attempt) => `✗ ${passed}/${total} tests pasan (intento ${attempt})`,
  yourConsole: "Tu consola:",
  timedOut: (seconds) => `✗ Tardó más de ${seconds}s. ¿Un bucle que nunca termina?`,
  crashed: "✗ Tu solución no cargó:",
  tsUnsupported: "✗ Esta versión de Node no corre TypeScript. Usa Node 22.6 o mayor, o cambia flavor a js.",
  unapproved: (track) => `✗ Los comandos de ${track} aún no están aprobados. Revísalos con btb setup ${track}.`,
  afterFail: "Ajusta y corre btb submit otra vez. Pista: btb hint   Por hoy no: btb skip",
  afterFailPlacement: "Ajusta y corre btb submit otra vez. Si no sale, btb skip sin pena.",

  hintHeader: (shown, total, cost) => `Pista ${shown} de ${total} (-${cost} XP)`,
  noMoreHints: "Ya viste todas las pistas. Si hoy no sale, btb skip y mañana regresa.",
  noHintsInPlacement: "En la ubicación no hay pistas. Si no sabes, btb skip, nadie te juzga.",
  skipped: (date) => `Lo dejamos por hoy. Regresa el ${date}.`,
  revealHint: "Si quieres ver cómo se resuelve: btb reveal",
  revealLocked: "La solución se abre después de resolverlo o saltarlo. Primero inténtalo.",
  revealHeader: (title) => `Solución de referencia: ${title}`,

  reviewLocked: "La revisión llega después de que pasen los tests.",
  reviewing: (title) => `Claude está revisando ${title}, puede tardar un minuto...`,

  placementIntro: (title) =>
    `Examen de ubicación de ${title}. Claude forjó pruebas que suben de dificultad, sin pistas.\n` +
    "Resuelve lo que puedas. Si una no sale, btb skip y listo: así Claude sabe dónde empezar, no es un juicio.",
  placementProgress: (answered, remaining) => `Ubicación: ${answered} respondidas, faltan ${remaining}`,
  placementLeft: (remaining) => `Ubicación: faltan ${remaining}. Sigue con btb next.`,
  placementDone: "Ubicación terminada.",
  placementPending: "Tienes la ubicación a medias. Sigue con btb next.",
  placementBusy: (track) => `Tienes la ubicación de ${track} a medias. Termínala o usa --restart.`,
  placementHeading: "ubicación",

  pathMissing: (track) => `Sin camino todavía. btb placement ${track} para que Claude lo trace.`,
  startsAt: (title, level, levelTitle) => `${title}: empiezas en el nivel ${level}, ${levelTitle}`,
  seePath: (track) => `El camino completo: btb path ${track}`,
  revision: (revision, date) => `trazo ${revision}, ${date}`,
  cleanOf: (clean, target) => `${clean}/${target} limpios`,

  learningLanguage: (language) => `Claude está averiguando cómo correr tests de ${language} en tu máquina...`,
  learnNeedsName: "Dime qué lenguaje: btb learn rust",
  trackExists: (id) => `Ya tienes la pista ${id}. Para rehacer su perfil: btb learn ${id} --again`,
  defaultFocus: (name) => `${name} desde lo básico hasta nivel de entrevista en una empresa grande, a mano.`,
  learned: (name, id) => `Pista nueva: ${name} (${id}).`,
  learnApprove: (id) => `Si confías en estos comandos: btb setup ${id} --yes`,
  learnReady: (id) => `Listo. Que Claude te ubique: btb placement ${id}`,
  learnAgain: (id) => `Para que Claude rehaga el perfil con estos errores: btb learn ${id} --again`,
  reviewCommands: "Claude propone correr estos comandos en tu máquina:",
  checkLabel: "revisar",
  testLabel: "tests  ",
  installLabel: "Para instalarlo",
  setupFailed: (name) => `${name} todavía no corre:`,
  setupDone: (name) => `${name} corre bien en tu máquina.`,

  todayHeader: (date) => `Hoy, ${date}`,
  streak: (days) => (days === 1 ? "racha 1 día" : `racha ${days} días`),
  xpToday: (xp, goal) => `XP ${xp}/${goal}`,
  firstTime: (track) => `¿Primera vez? btb placement ${track}: Claude te mide en unos minutos y traza tu camino.`,
  slotTitle: "nuevo, Claude lo forja al abrirlo",
  goNext: "Siguiente: btb next",
  allDone: (xp, goal) => `Terminaste lo de hoy. ${xp}/${goal} XP.`,
  moreHint: "¿Con ganas de más? btb next --more",

  totals: (xp, streak, solved, mastered) => `XP total ${xp}   racha ${streak}   resueltos ${solved}   dominados ${mastered}`,
  placedOut: "ubicado arriba",
  planHeader: "Tu ruta",
  pace: (dailyNew, daysPerWeek, tracks) => `Ritmo: ${dailyNew} nuevos por sesión entre ${tracks} ${tracks === 1 ? "pista" : "pistas"}, ${daysPerWeek} días a la semana`,
  readyBy: (date) => `listo hacia ${date}`,
  goalsHeader: "Metas",
  noGoals: "Sin metas todavía. Agrégalas en goals de btb.config.json.",
  goalDone: "✓ cumplida",
  goalOnTrack: "✓ a tiempo",
  goalBehind: "✗ atrasada",
  goalUnknown: "? ese nivel no existe en el camino",
  by: (date) => `para ${date}`,
  projected: (date) => `(proyección ${date})`,
  legend: "★ dominado   ↻ toca repaso   ✓ resuelto   ~ empezado   · nuevo",
  nothingForged: "Aún no hay ejercicios. btb next y Claude forja el primero.",
};
