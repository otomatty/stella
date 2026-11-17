export function first<T>(items: readonly T[]): T | undefined {
  return items[0];
}

export function last<T>(items: readonly T[]): T | undefined {
  return items[items.length - 1];
}

export function repeat<T>(value: T, times: number): T[] {
  const result: T[] = [];
  for (let i = 0; i < times; i++) {
    result.push(value);
  }
  return result;
}

export function pair<A, B>(a: A, b: B): [A, B] {
  return [a, b];
}

export type Box<T> = { value: T };

export function box<T>(value: T): Box<T> {
  return { value };
}

export function unbox<T>(box: Box<T>): T {
  return box.value;
}
