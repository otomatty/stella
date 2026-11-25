// 問題
// いくつでも引数を受け取れる関数（残余引数。...numbers: number[] のように書く）を書いてください。
// 引数と戻り値には型注釈を付けること。
//
// 1. sumAll(...numbers)
//    すべての合計を返す。引数がなければ 0
//
// 2. maxOf(first, ...rest)
//    最大値を返す。引数が1つもない呼び出しは型エラーにしたいので、1つ目は普通の引数にする
//
// 3. joinPath(...parts)
//    パスの部品を「/」でつなぐ。部品の前後の「/」は取り除き、空になった部品は飛ばす
//    例: joinPath("a/", "/b", "", "c") → "a/b/c"
//
// 4. tagged(tag, ...items)
//    "[tag] a, b, c" の形にする。items がなければ "[tag]"

export function sumAll(...numbers: number[]): number {
  let total = 0;
  for (const n of numbers) {
    total += n;
  }
  return total;
}

export function maxOf(first: number, ...rest: number[]): number {
  let max = first;
  for (const n of rest) {
    if (n > max) {
      max = n;
    }
  }
  return max;
}

export function joinPath(...parts: string[]): string {
  const cleaned: string[] = [];
  for (const part of parts) {
    const trimmed = part.replace(/^\/+|\/+$/g, "");
    if (trimmed !== "") {
      cleaned.push(trimmed);
    }
  }
  return cleaned.join("/");
}

export function tagged(tag: string, ...items: string[]): string {
  return items.length === 0 ? `[${tag}]` : `[${tag}] ${items.join(", ")}`;
}
