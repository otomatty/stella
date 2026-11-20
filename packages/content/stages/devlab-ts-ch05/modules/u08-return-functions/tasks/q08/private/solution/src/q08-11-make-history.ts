// 05-q08 関数を返す関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-is-a-value
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問11
export function makeHistory(): { add: (text: string) => void; list: () => string[] } {
  const items: string[] = [];
  return {
    add: (text) => {
      items.push(text);
    },
    list: () => [...items],
  };
}
