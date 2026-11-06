export type User = { id: number; name: string };

// 問1
export function toSet(items: string[]): Set<string> {
  return new Set(items);
}

// 問2
export function uniqueCount(items: string[]): number {
  return new Set(items).size;
}

// 問3
export function hasDuplicates(items: number[]): boolean {
  return new Set(items).size !== items.length;
}

// 問4
export function uniqueSorted(items: number[]): number[] {
  return [...new Set(items)].sort((a, b) => a - b);
}

// 問5
export function uniqueChars(text: string): string {
  return [...new Set(text)].join("");
}

// 問6
export function withAdded(set: Set<string>, value: string): Set<string> {
  const result = new Set(set);
  result.add(value);
  return result;
}

// 問7
export function withRemoved(set: Set<string>, value: string): Set<string> {
  const result = new Set(set);
  result.delete(value);
  return result;
}

// 問8
export function toggle(set: Set<string>, value: string): Set<string> {
  const result = new Set(set);
  if (result.has(value)) {
    result.delete(value);
  } else {
    result.add(value);
  }
  return result;
}

// 問9
export function union(a: Set<number>, b: Set<number>): Set<number> {
  return new Set([...a, ...b]);
}

// 問10
export function intersection(a: Set<number>, b: Set<number>): Set<number> {
  return new Set([...a].filter((n) => b.has(n)));
}

// 問11
export function difference(a: Set<number>, b: Set<number>): Set<number> {
  return new Set([...a].filter((n) => !b.has(n)));
}

// 問12
export function symmetricDifference(a: Set<number>, b: Set<number>): Set<number> {
  return new Set([...[...a].filter((n) => !b.has(n)), ...[...b].filter((n) => !a.has(n))]);
}

// 問13
export function isSubset(a: Set<number>, b: Set<number>): boolean {
  return [...a].every((n) => b.has(n));
}

// 問14
export function hasAll(set: Set<string>, values: string[]): boolean {
  return values.every((value) => set.has(value));
}

// 問15
export function hasAny(set: Set<string>, values: string[]): boolean {
  return values.some((value) => set.has(value));
}

// 問16
export function commonChars(a: string, b: string): string {
  const inB = new Set(b);
  return [...new Set(a)].filter((char) => inB.has(char)).join("");
}

// 問17
export function firstRepeated(items: string[]): string | undefined {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item)) {
      return item;
    }
    seen.add(item);
  }
  return undefined;
}

// 問18
export function uniqueById(users: User[]): User[] {
  const seen = new Set<number>();
  return users.filter((user) => {
    if (seen.has(user.id)) {
      return false;
    }
    seen.add(user.id);
    return true;
  });
}

// 問19
export function allTags(posts: { tags: string[] }[]): string[] {
  return [...new Set(posts.flatMap((post) => post.tags))];
}

// 問20
export function sameMembers(a: string[], b: string[]): boolean {
  const setA = new Set(a);
  const setB = new Set(b);
  return setA.size === setB.size && [...setA].every((item) => setB.has(item));
}
