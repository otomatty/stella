export function createCounter(start = 0): {
  increment: () => number;
  reset: () => void;
  current: () => number;
} {
  let value = start;
  return {
    increment: () => {
      value++;
      return value;
    },
    reset: () => {
      value = start;
    },
    current: () => value,
  };
}

export function makeMultiplier(n: number): (x: number) => number {
  return (x) => x * n;
}

export function once(fn: () => number): () => number {
  let result: number | undefined;
  return () => {
    result ??= fn();
    return result;
  };
}

export function makeIdGenerator(prefix: string): () => string {
  let count = 0;
  return () => {
    count++;
    return `${prefix}-${count}`;
  };
}
