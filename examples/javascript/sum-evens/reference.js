export function sumEvens(numbers) {
  let total = 0;
  for (const number of numbers) {
    if (number % 2 === 0) total += number;
  }
  return total;
}
