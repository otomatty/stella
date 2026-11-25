// 問19 width × height の合計を返す。Box と Paper が混ざった配列も渡せる
//     例: sumArea([{ width: 2, height: 3 }, { width: 1, height: 1 }]) → 7
// 引数と戻り値には型注釈を付けます。

export type Box = { width: number; height: number; depth: number };

export type Paper = { width: number; height: number };

export function sumArea(items: readonly { width: number; height: number }[]): number {
  let total = 0;
  for (const item of items) {
    total += item.width * item.height;
  }
  return total;
}
