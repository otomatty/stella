// 問1
export function toMap(pairs: [string, number][]): Map<string, number> {
  return new Map(pairs);
}

// 問2
export function scoreOf(scores: Map<string, number>, name: string): number {
  return scores.get(name) ?? 0;
}

// 問3
export function hasName(scores: Map<string, number>, name: string): boolean {
  return scores.has(name);
}

// 問4
export function withScore(
  scores: Map<string, number>,
  name: string,
  score: number,
): Map<string, number> {
  const result = new Map(scores);
  result.set(name, score);
  return result;
}

// 問5
export function withoutName(scores: Map<string, number>, name: string): Map<string, number> {
  const result = new Map(scores);
  result.delete(name);
  return result;
}

// 問6
export function sizeOf(scores: Map<string, number>): number {
  return scores.size;
}

// 問7
export function namesOf(scores: Map<string, number>): string[] {
  return [...scores.keys()];
}

// 問8
export function totalScore(scores: Map<string, number>): number {
  let total = 0;
  for (const score of scores.values()) {
    total += score;
  }
  return total;
}

// 問9
export function toObject(scores: Map<string, number>): Record<string, number> {
  return Object.fromEntries(scores);
}

// 問10
export function fromObject(obj: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(obj));
}

// 問11
export function charCounts(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const char of text) {
    counts.set(char, (counts.get(char) ?? 0) + 1);
  }
  return counts;
}

// 問12
export function groupByInitial(words: readonly string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const word of words) {
    const initial = word.slice(0, 1);
    const group = groups.get(initial);
    if (group === undefined) {
      groups.set(initial, [word]);
    } else {
      group.push(word);
    }
  }
  return groups;
}

// 問13
export function invert(map: Map<string, string>): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of map) {
    result.set(value, key);
  }
  return result;
}

// 問14
export function mergeAdd(a: Map<string, number>, b: Map<string, number>): Map<string, number> {
  const result = new Map(a);
  for (const [key, value] of b) {
    result.set(key, (result.get(key) ?? 0) + value);
  }
  return result;
}

// 問15
export function topName(scores: Map<string, number>): string | undefined {
  let best: [string, number] | undefined;
  for (const entry of scores) {
    if (best === undefined || entry[1] > best[1]) {
      best = entry;
    }
  }
  return best?.[0];
}

// 問16
export function sortedByValue(scores: Map<string, number>): [string, number][] {
  return [...scores.entries()].sort((a, b) => b[1] - a[1]);
}

// 問17
export function atLeast(scores: Map<string, number>, min: number): Map<string, number> {
  return new Map([...scores].filter(([, score]) => score >= min));
}

// 問18
export function mapValues(
  scores: Map<string, number>,
  fn: (n: number) => number,
): Map<string, number> {
  return new Map([...scores].map(([key, value]): [string, number] => [key, fn(value)]));
}

// 問19
export function firstIndex(words: readonly string[]): Map<string, number> {
  const result = new Map<string, number>();
  words.forEach((word, i) => {
    if (!result.has(word)) {
      result.set(word, i);
    }
  });
  return result;
}

// 問20
export function lastSeen(events: readonly { user: string; time: number }[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const event of events) {
    const current = result.get(event.user);
    if (current === undefined || event.time > current) {
      result.set(event.user, event.time);
    }
  }
  return result;
}
