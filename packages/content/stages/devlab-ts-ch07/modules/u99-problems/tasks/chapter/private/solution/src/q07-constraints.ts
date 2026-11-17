export function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

export function longest<T extends { length: number }>(a: T, b: T): T {
  return b.length > a.length ? b : a;
}

export function pluck<T, K extends keyof T>(items: readonly T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

export function withId<T extends object>(value: T, id: number): T & { id: number } {
  return { ...value, id };
}
