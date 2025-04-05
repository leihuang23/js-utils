export function memoPromise<T, A extends unknown[]>(
  asyncFn: (...args: A) => Promise<T>,
  options: {
    expiresIn?: number;
    maxSize?: number;
    keyFn?: (args: A) => string;
  } = {}
): (...args: A) => Promise<T> {
  const { expiresIn = 0, maxSize = 100, keyFn = (args: A) => JSON.stringify(args) } = options;

  const cache = new Map<
    string,
    {
      promise: Promise<T>;
      expiry: number | null;
    }
  >();

  return async function (...args: A): Promise<T> {
    const key = keyFn(args);

    if (cache.has(key)) {
      const { promise, expiry } = cache.get(key)!;

      if (!expiry || expiry > Date.now()) {
        return promise;
      }

      cache.delete(key);
    }

    const promise = asyncFn(...args);

    // Only cache if maxSize is greater than 0
    if (maxSize > 0) {
      // If cache is full, remove oldest entry
      if (cache.size >= maxSize) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey) {
          cache.delete(oldestKey);
        }
      }

      const expiry = expiresIn > 0 ? Date.now() + expiresIn : null;

      cache.set(key, { promise, expiry });

      // Remove from cache if the promise fails
      promise.catch(() => {
        cache.delete(key);
      });
    }

    return promise;
  };
}
