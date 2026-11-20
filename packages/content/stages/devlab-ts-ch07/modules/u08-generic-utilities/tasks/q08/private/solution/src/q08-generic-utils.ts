export function groupBy<T>(items: readonly T[], keyFn: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    groups[key] = [...(groups[key] ?? []), item];
  }
  return groups;
}

export function countBy<T>(
  items: readonly T[],
  keyFn: (item: T) => string,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export function partition<T>(items: readonly T[], predicate: (item: T) => boolean): [T[], T[]] {
  const yes: T[] = [];
  const no: T[] = [];
  for (const item of items) {
    if (predicate(item)) {
      yes.push(item);
    } else {
      no.push(item);
    }
  }
  return [yes, no];
}

export function uniqueBy<T>(items: readonly T[], keyFn: (item: T) => string | number): T[] {
  const seen: (string | number)[] = [];
  const result: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!seen.includes(key)) {
      seen.push(key);
      result.push(item);
    }
  }
  return result;
}

export function sortBy<T>(items: readonly T[], keyFn: (item: T) => number): T[] {
  return [...items].sort((a, b) => keyFn(a) - keyFn(b));
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size < 1) {
    throw new Error("size は1以上にしてください");
  }
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}
