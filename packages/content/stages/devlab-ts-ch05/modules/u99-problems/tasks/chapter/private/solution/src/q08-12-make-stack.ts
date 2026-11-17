// 05-q08 関数を返す関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-is-a-value
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問12
export function makeStack(): {
  push: (n: number) => void;
  pop: () => number | undefined;
  size: () => number;
} {
  const items: number[] = [];
  return {
    push: (n) => {
      items.push(n);
    },
    pop: () => items.pop(),
    size: () => items.length,
  };
}
