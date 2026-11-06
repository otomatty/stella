export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timer = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error("タイムアウトしました"));
    }, ms);
  });
  return Promise.race([promise, timer]);
}

export function withLoading<T>(
  promise: Promise<T>,
  setLoading: (loading: boolean) => void,
): Promise<T> {
  setLoading(true);
  return promise.finally(() => {
    setLoading(false);
  });
}

export function orDefault<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return promise.catch(() => fallback);
}

export function sumAll(promises: readonly Promise<number>[]): Promise<number> {
  return Promise.all(promises).then((values) => values.reduce((sum, n) => sum + n, 0));
}
