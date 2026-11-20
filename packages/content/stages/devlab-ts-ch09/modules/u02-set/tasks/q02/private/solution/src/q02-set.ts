export function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

export function intersection<T>(a: readonly T[], b: readonly T[]): T[] {
  const inB = new Set(b);
  return unique(a.filter((item) => inB.has(item)));
}

export function difference<T>(a: readonly T[], b: readonly T[]): T[] {
  const inB = new Set(b);
  return unique(a.filter((item) => !inB.has(item)));
}

export function union<T>(a: readonly T[], b: readonly T[]): T[] {
  return [...new Set([...a, ...b])];
}

export function isSubset<T>(a: readonly T[], b: readonly T[]): boolean {
  const inB = new Set(b);
  return a.every((item) => inB.has(item));
}
