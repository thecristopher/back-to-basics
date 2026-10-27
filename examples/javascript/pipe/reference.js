export function pipe(...fns) {
  return (input) => fns.reduce((value, fn) => fn(value), input);
}
