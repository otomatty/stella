// 05-q08 関数を返す関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-is-a-value
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問18
export function makeLapTimer(): (t: number) => number {
  let last = 0;
  return (t) => {
    const lap = t - last;
    last = t;
    return lap;
  };
}
