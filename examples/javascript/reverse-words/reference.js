export function reverseWords(sentence) {
  const words = sentence.trim().split(/\s+/).filter(Boolean);
  return words.reverse().join(" ");
}
