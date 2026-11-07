// 05-q08 関数を返す関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-is-a-value
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問10
export function makeLimiter(max: number): () => boolean {
  let used = 0;
  return () => {
    used++;
    return used <= max;
  };
}
