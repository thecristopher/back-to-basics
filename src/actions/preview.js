// The browser page that shows a React exercise while the learner builds it: plain strings and the
// Vite options, so the server in lib only has to write them and start it.

const STYLE = `
:root { color-scheme: light dark; --bg: #f6f5f2; --card: #ffffff; --ink: #1d1d1f; --muted: #6b6b70; --line: #dddad3; --bad: #b3261e; }
@media (prefers-color-scheme: dark) { :root { --bg: #161618; --card: #202023; --ink: #ececee; --muted: #9a9aa1; --line: #34343a; --bad: #ff8a80; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.5 system-ui, sans-serif; }
header { max-width: 760px; margin: 0 auto; padding: 28px 16px 8px; }
header h1 { margin: 0; font-size: 22px; }
header p { margin: 4px 0 0; color: var(--muted); font-size: 14px; }
main { max-width: 760px; margin: 0 auto; padding: 8px 16px 40px; }
#root { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 8px 20px 20px; }
#root h2 { font-size: 13px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; margin: 20px 0 8px; }
.btb-broken { color: var(--bad); white-space: pre-wrap; font: 14px/1.5 ui-monospace, monospace; }
`;

function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}

/**
 * The page the preview opens: the exercise title on top and the learner's component below.
 * @param {{ title: string, subtitle: string, lang: string }} input
 * @returns {string} index.html
 */
export function previewPage({ title, subtitle, lang }) {
  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body>
<header><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></header>
<main><div id="root"></div></main>
<script type="module" src="/main.jsx"></script>
</body>
</html>
`;
}

/**
 * The module that mounts the exercise's preview, and shows what broke instead of a blank page
 * when the learner's component throws.
 * @param {{ previewFile: string, broken: string }} input previewFile is absolute, broken heads the error
 * @returns {string} main.jsx
 */
export function previewEntry({ previewFile, broken }) {
  return `import { Component } from "react";
import { createRoot } from "react-dom/client";
import Preview from ${JSON.stringify(`/@fs${previewFile}`)};

class Guard extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return <p className="btb-broken">{${JSON.stringify(broken)}}{"\\n\\n"}{String(this.state.error?.message ?? this.state.error)}</p>;
  }
}

createRoot(document.getElementById("root")).render(<Guard><Preview /></Guard>);
`;
}

// any react or react-dom import, from the page or from the learner's folder, comes from the runtime
function runtimeAlias(modules) {
  return ["react-dom", "react"].map((name) => ({ find: new RegExp(`^${name}(/.*)?$`), replacement: `${modules}/${name}$1` }));
}

/**
 * The Vite options that serve the page and reload it every time the learner saves.
 * @param {{ runtime: string, page: string, folder: string, port: number }} input
 *   runtime holds node_modules, page the generated index.html, folder the learner's files
 * @returns {object} options for vite's createServer
 */
export function viteOptions({ runtime, page, folder, port }) {
  return {
    configFile: false,
    root: page,
    cacheDir: `${runtime}/.vite-preview`,
    logLevel: "error",
    clearScreen: false,
    esbuild: { jsx: "automatic" },
    resolve: { alias: runtimeAlias(`${runtime}/node_modules`) },
    server: { port, open: true, fs: { allow: [page, folder, runtime] } },
  };
}
