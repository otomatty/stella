// 問題
// 05-q10 では生徒（Student）の配列だけに使える groupBy などを書きました。
// これを型変数を使って、どんな配列にも使えるように書き直してください。any や unknown で逃げないこと。
// 引数の配列は readonly T[] にし、元の配列は変えないこと。
//
// 1. groupBy(items, keyFn): keyFn(要素) が返す文字列ごとにまとめる。戻り値は Record<string, T[]>
// 2. countBy(items, keyFn): keyFn(要素) が返す文字列ごとに数える。戻り値は Record<string, number>
// 3. partition(items, predicate): [true の配列, false の配列] を返す。戻り値は [T[], T[]]
// 4. uniqueBy(items, keyFn): keyFn(要素) が同じものは最初の1つだけ残す。keyFn は string か number を返す
// 5. sortBy(items, keyFn): keyFn(要素) が返す数値の小さい順に並べた新しい配列。同じなら元の順
// 6. chunk(items, size): size 個ずつに区切る。戻り値は T[][]。size が 1 未満なら Error を投げる

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
