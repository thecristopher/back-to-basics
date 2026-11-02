import assert from "node:assert/strict";
import { test } from "node:test";
import { previewEntry, previewPage, viteOptions } from "../src/actions/preview.js";
import { previewPrompt } from "../src/actions/prompts/preview.js";
import { withoutFences } from "../src/utils/text.js";

const options = viteOptions({ runtime: "/btb/runtimes/react", page: "/btb/runtimes/react/preview", folder: "/ws/react/love-note", port: 5180 });

function resolveAlias(id) {
  const alias = options.resolve.alias.find((entry) => entry.find.test(id));
  return alias ? id.replace(alias.find, alias.replacement) : id;
}

test("the page carries the title of Claire's exercise, escaped", () => {
  const page = previewPage({ title: "Notas <de> Claire & Inde", subtitle: "Se recarga al guardar", lang: "es" });
  assert.match(page, /<title>Notas &lt;de&gt; Claire &amp; Inde<\/title>/);
  assert.match(page, /<html lang="es">/);
  assert.match(page, /src="\/main.jsx"/);
});

test("the entry imports the learner's preview through the file system and guards against a crash", () => {
  const entry = previewEntry({ previewFile: "/ws/react/love-note/preview.jsx", broken: "Tu componente truena:" });
  assert.match(entry, /import Preview from "\/@fs\/ws\/react\/love-note\/preview.jsx";/);
  assert.match(entry, /getDerivedStateFromError/);
  assert.match(entry, /"Tu componente truena:"/);
});

test("react and react-dom always come from the runtime, wherever Malenia's solution lives", () => {
  assert.equal(resolveAlias("react"), "/btb/runtimes/react/node_modules/react");
  assert.equal(resolveAlias("react/jsx-runtime"), "/btb/runtimes/react/node_modules/react/jsx-runtime");
  assert.equal(resolveAlias("react-dom/client"), "/btb/runtimes/react/node_modules/react-dom/client");
  assert.equal(resolveAlias("./solution.jsx"), "./solution.jsx");
});

test("vite may read the page, the learner's folder and the runtime, nothing else", () => {
  assert.deepEqual(options.server.fs.allow, ["/btb/runtimes/react/preview", "/ws/react/love-note", "/btb/runtimes/react"]);
  assert.equal(options.configFile, false);
  assert.equal(options.root, "/btb/runtimes/react/preview");
});

test("a preview prompt names the file, the import and the readme example", () => {
  const prompt = previewPrompt({
    title: "Nota de amor",
    readme: "# Nota de amor\n<LoveNote from=\"Claire\" />",
    reference: "export function LoveNote() {}",
    files: { solutionFile: "solution.jsx", previewFile: "preview.jsx" },
  });
  assert.match(prompt, /^BTB_TASK: preview/);
  assert.match(prompt, /imports the component from "\.\/solution.jsx"/);
  assert.match(prompt, /<LoveNote from="Claire" \/>/);
  assert.match(prompt, /code of preview.jsx only/);
});

test("a fenced answer loses its fence and a plain one stays as it is", () => {
  assert.equal(withoutFences("```jsx\nexport default function Preview() {}\n```"), "export default function Preview() {}\n");
  assert.equal(withoutFences("export default function Preview() {}"), "export default function Preview() {}\n");
});
