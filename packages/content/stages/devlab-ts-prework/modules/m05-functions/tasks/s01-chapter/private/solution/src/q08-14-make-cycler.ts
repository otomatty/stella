// 05-q08 関数を返す関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-is-a-value
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問14
export function makeCycler(items: readonly string[]): () => string {
  if (items.length === 0) {
    throw new Error("空の配列です");
  }
  let index = 0;
  return () => {
    const item = items[index % items.length] ?? "";
    index++;
    return item;
  };
}
