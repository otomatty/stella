// 05-q08 関数を返す関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-is-a-value
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問9
export function onlyOnce(fn: () => number): () => number {
  let called = false;
  let result = 0;
  return () => {
    if (!called) {
      result = fn();
      called = true;
    }
    return result;
  };
}
