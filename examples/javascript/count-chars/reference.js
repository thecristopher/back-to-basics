export function countChars(text) {
  const counts = {};
  for (const char of text.toLowerCase()) {
    if (char.trim() === "") continue;
    counts[char] = (counts[char] ?? 0) + 1;
  }
  return counts;
}
