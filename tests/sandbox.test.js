import assert from "node:assert/strict";
import { test } from "node:test";
import { containerVars, containerfile, imageTag, podmanRunArgs, sandboxChoice } from "../src/actions/sandbox.js";

const react = {
  id: "react",
  sandbox: { image: "docker.io/library/node:24-slim" },
  runtime: { setup: [["npm", "install", "vitest@3.2.7"], ["{node}", "--version"]] },
};
const learned = { id: "elixir" };

test("auto sends Claire's tests to Podman when it answers", () => {
  assert.equal(sandboxChoice("auto", react, true), "container");
});

test("auto falls back to this machine when Podman is down", () => {
  assert.equal(sandboxChoice("auto", react, false), "host");
});

test("podman refuses to run Malenia's tests outside a container", () => {
  assert.equal(sandboxChoice("podman", react, false), "unavailable");
  assert.equal(sandboxChoice("podman", learned, true), "unavailable");
});

test("off and a language without an image both stay on this machine", () => {
  assert.equal(sandboxChoice("off", react, true), "host");
  assert.equal(sandboxChoice("auto", learned, true), "host");
});

test("the image tag stays the same for the same recipe and changes with it", () => {
  const tag = imageTag(react, { "setup.mjs": "cleanup" });
  assert.match(tag, /^localhost\/btb-react:[0-9a-f]{12}$/);
  assert.equal(imageTag(react, { "setup.mjs": "cleanup" }), tag);
  assert.notEqual(imageTag(react, { "setup.mjs": "Inde's anniversary" }), tag);
});

test("the Containerfile copies the runtime files and runs the setup with the container's node", () => {
  const file = containerfile(react, ["setup.mjs"]);
  assert.match(file, /^FROM docker\.io\/library\/node:24-slim\nWORKDIR \/runtime\n/);
  assert.match(file, /COPY \["setup\.mjs","\/runtime\/setup\.mjs"\]/);
  assert.match(file, /RUN \["npm","install","vitest@3\.2\.7"\]/);
  assert.match(file, /RUN \["node","--version"\]/);
});

test("the test command sees the run folder inside the runtime, so node_modules resolve", () => {
  const vars = containerVars({ solutionFile: "solution.jsx", testFile: "solution.test.jsx" }, true);
  assert.equal(vars.testRel, "runs/run/solution.test.jsx");
  assert.equal(vars.runtime, "/runtime");
  assert.equal(vars.report, "/runtime/runs/run/report.json");
});

test("Leon's run has no network, no capabilities and its own timeout", () => {
  const args = podmanRunArgs({ name: "btb-run-leon", image: "localhost/btb-react:abc", runDir: "/data/run-1", root: "/repo", timeoutMs: 15500, hasRuntime: false, command: ["node", "t.js"] });
  assert.deepEqual(args.slice(0, 2), ["podman", "run"]);
  for (const flag of ["--rm", "--network=none", "--cap-drop=all", "--timeout=16", "--volume=/data/run-1:/runtime/runs/run", "--volume=/repo/src:/btb/src:ro", "--workdir=/runtime/runs/run"]) {
    assert.ok(args.includes(flag), flag);
  }
  assert.deepEqual(args.slice(-3), ["localhost/btb-react:abc", "node", "t.js"]);
});
