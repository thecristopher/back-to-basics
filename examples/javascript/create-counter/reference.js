export function createCounter(start = 0) {
  let count = start;
  return {
    increment: () => ++count,
    decrement: () => --count,
    reset: () => (count = start),
    value: () => count,
  };
}
