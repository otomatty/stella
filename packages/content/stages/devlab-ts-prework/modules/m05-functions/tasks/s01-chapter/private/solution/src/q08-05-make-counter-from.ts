// 05-q08 関数を返す関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-is-a-value
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問5
export function makeCounterFrom(start: number): () => number {
  let current = start;
  return () => {
    const value = current;
    current++;
    return value;
  };
}
