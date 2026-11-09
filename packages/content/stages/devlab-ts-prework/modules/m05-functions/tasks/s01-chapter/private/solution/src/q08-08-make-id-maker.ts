// 05-q08 関数を返す関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-is-a-value
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問8
export function makeIdMaker(prefix: string): () => string {
  let count = 0;
  return () => {
    count++;
    return `${prefix}${count}`;
  };
}
