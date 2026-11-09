// 05-q08 関数を返す関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-is-a-value
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問7
export function makeAccumulator(): (n: number) => number {
  let total = 0;
  return (n) => {
    total += n;
    return total;
  };
}
