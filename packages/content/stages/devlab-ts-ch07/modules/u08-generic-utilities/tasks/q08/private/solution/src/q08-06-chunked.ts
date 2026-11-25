// 問6 size 個ずつに区切る。size が 1 未満なら Error を投げる
//     例: chunked(["a", "b", "c"], 2) → [["a", "b"], ["c"]]
// 型変数を使い、unknown で型を置き換えないでください。
// 配列の引数は readonly T[] にし、元の配列は変更しません。

export function chunked<T>(items: readonly T[], size: number): T[][] {
  if (size < 1) {
    throw new Error("size は1以上にしてください");
  }
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}
