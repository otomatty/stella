// 05-q08 関数を返す関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-is-a-value
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問4
export function makeCounter(): () => number {
  let count = 0;
  return () => {
    count++;
    return count;
  };
}
