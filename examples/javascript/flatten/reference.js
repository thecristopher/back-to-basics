export function flatten(array) {
  const result = [];
  for (const item of array) {
    if (Array.isArray(item)) result.push(...flatten(item));
    else result.push(item);
  }
  return result;
}
