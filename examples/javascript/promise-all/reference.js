export function promiseAll(values) {
  return new Promise((resolve, reject) => {
    const results = new Array(values.length);
    let pending = values.length;
    if (pending === 0) {
      resolve(results);
      return;
    }
    values.forEach((value, index) => {
      Promise.resolve(value).then((result) => {
        results[index] = result;
        pending -= 1;
        if (pending === 0) resolve(results);
      }, reject);
    });
  });
}
