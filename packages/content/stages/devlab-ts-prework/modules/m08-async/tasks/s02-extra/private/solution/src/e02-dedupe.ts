export function dedupe<K extends string | number, V>(
  fn: (key: K) => Promise<V>,
): (key: K) => Promise<V> {
  const cache = new Map<K, Promise<V>>();
  return (key) => {
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const promise = fn(key).catch((error: unknown) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, promise);
    return promise;
  };
}
