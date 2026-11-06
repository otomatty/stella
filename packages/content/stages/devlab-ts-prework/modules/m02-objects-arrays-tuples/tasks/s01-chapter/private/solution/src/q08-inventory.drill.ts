// 問1
export function scoreOf(scores: { [name: string]: number }, name: string): number {
  return scores[name] ?? 0;
}

// 問2
export function hasKey(record: { [key: string]: string }, key: string): boolean {
  return record[key] !== undefined;
}

// 問3
export function setScore(
  scores: { [name: string]: number },
  name: string,
  score: number,
): { [name: string]: number } {
  return { ...scores, [name]: score };
}

// 問4
export function keyCount(record: { [key: string]: number }): number {
  return Object.keys(record).length;
}

// 問5
export function sumValues(record: { [key: string]: number }): number {
  let total = 0;
  for (const value of Object.values(record)) {
    total += value;
  }
  return total;
}

// 問6
export function increment(
  counts: { [key: string]: number },
  key: string,
): { [key: string]: number } {
  return { ...counts, [key]: (counts[key] ?? 0) + 1 };
}

// 問7
export function countWords(words: readonly string[]): { [word: string]: number } {
  const counts: { [word: string]: number } = {};
  for (const word of words) {
    counts[word] = (counts[word] ?? 0) + 1;
  }
  return counts;
}

// 問8
export function countChars(text: string): { [char: string]: number } {
  const counts: { [char: string]: number } = {};
  for (const char of text) {
    counts[char] = (counts[char] ?? 0) + 1;
  }
  return counts;
}

// 問9
export function keysOf(record: { [key: string]: number }): string[] {
  return Object.keys(record);
}

// 問10
export function topKey(record: { [key: string]: number }): string | undefined {
  let top: string | undefined;
  let best = -Infinity;
  for (const [key, value] of Object.entries(record)) {
    if (value > best) {
      top = key;
      best = value;
    }
  }
  return top;
}

// 問11
export function invert(record: { [key: string]: string }): { [value: string]: string } {
  const result: { [value: string]: string } = {};
  for (const [key, value] of Object.entries(record)) {
    result[value] = key;
  }
  return result;
}

// 問12
export function pickKeys(
  record: { [key: string]: number },
  keys: readonly string[],
): { [key: string]: number } {
  const result: { [key: string]: number } = {};
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// 問13
export function removeKey(
  record: { [key: string]: number },
  key: string,
): { [key: string]: number } {
  const result: { [key: string]: number } = {};
  for (const [k, value] of Object.entries(record)) {
    if (k !== key) {
      result[k] = value;
    }
  }
  return result;
}

// 問14
export function mergeCounts(
  a: { [key: string]: number },
  b: { [key: string]: number },
): { [key: string]: number } {
  const result = { ...a };
  for (const [key, value] of Object.entries(b)) {
    result[key] = (result[key] ?? 0) + value;
  }
  return result;
}

// 問15
export function groupByLength(words: readonly string[]): { [length: string]: string[] } {
  const groups: { [length: string]: string[] } = {};
  for (const word of words) {
    const key = String(word.length);
    groups[key] = [...(groups[key] ?? []), word];
  }
  return groups;
}

// 問16
export function priceOf(prices: { [item: string]: number }, item: string): number {
  const price = prices[item];
  if (price === undefined) {
    throw new Error(`${item} の価格がありません`);
  }
  return price;
}

// 問17
export function orderTotal(
  prices: { [item: string]: number },
  order: { [item: string]: number },
): number {
  let total = 0;
  for (const [item, quantity] of Object.entries(order)) {
    const price = prices[item];
    if (price === undefined) {
      throw new Error(`${item} の価格がありません`);
    }
    total += price * quantity;
  }
  return total;
}

// 問18
export function filterAtLeast(
  record: { [key: string]: number },
  min: number,
): { [key: string]: number } {
  const result: { [key: string]: number } = {};
  for (const [key, value] of Object.entries(record)) {
    if (value >= min) {
      result[key] = value;
    }
  }
  return result;
}

// 問19
export function entriesText(record: { [key: string]: number }): string {
  return Object.entries(record)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
}

// 問20
export function lookupOr(record: { [key: string]: string }, key: string, fallback: string): string {
  return record[key] ?? fallback;
}
