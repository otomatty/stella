// 05-q08 関数を返す関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-is-a-value
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問20
export function makeTagger(tag: string): (text: string) => string {
  return (text) => `<${tag}>${text}</${tag}>`;
}
