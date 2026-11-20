const EDGE_LENGTH = 160;

function clip(line) {
  return line.length > EDGE_LENGTH ? `${line.slice(0, EDGE_LENGTH)}...` : line;
}

/**
 * The first and last lines of a briefing, what the next one must not echo.
 * @param {string} text the briefing as markdown
 * @returns {{ opening: string, closing: string } | null} null for an empty briefing
 */
export function briefEdges(text) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  return { opening: clip(lines[0]), closing: clip(lines.at(-1)) };
}
