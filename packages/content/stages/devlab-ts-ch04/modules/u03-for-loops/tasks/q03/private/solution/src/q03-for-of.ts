// 問題
// 次の3つの関数を、for 文か for-of 文を使って書いてください。引数と戻り値には型注釈を付けること。
//
// 1. chunk(items, size)
//    配列を size 個ずつに区切った配列を返す。最後の区切りは size 個より少なくてもよい。
//    引数の配列は readonly number[]、戻り値は number[][]。size が 1 未満なら Error を投げる
//    例: chunk([1, 2, 3, 4, 5], 2) → [[1, 2], [3, 4], [5]]
//
// 2. findFirstDuplicate(items)
//    2回目に出てきた要素のうち、いちばん早く出てきたものを返す。重複がなければ undefined
//    引数は readonly string[]
//    例: findFirstDuplicate(["a", "b", "c", "b", "a"]) → "b"
//
// 3. multiplicationTable(n)
//    n の段の九九を、"3 × 1 = 3" の形で 1〜9 まで並べた配列を返す
// map や filter などでループを置き換えないでください。
export function chunk(items: readonly number[], size: number): number[][] {
  if (size < 1) {
    throw new Error("size は1以上にしてください");
  }
  const result: number[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

export function findFirstDuplicate(items: readonly string[]): string | undefined {
  const seen: string[] = [];
  for (const item of items) {
    if (seen.includes(item)) {
      return item;
    }
    seen.push(item);
  }
  return undefined;
}

export function multiplicationTable(n: number): string[] {
  const lines: string[] = [];
  for (let i = 1; i <= 9; i++) {
    lines.push(`${n} × ${i} = ${n * i}`);
  }
  return lines;
}
