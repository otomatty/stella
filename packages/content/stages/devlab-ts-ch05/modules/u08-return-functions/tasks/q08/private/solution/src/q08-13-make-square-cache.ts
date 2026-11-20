// 05-q08 関数を返す関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-is-a-value
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問13
export function makeSquareCache(): { square: (n: number) => number; computed: () => number } {
  const cache: { [key: string]: number } = {};
  let count = 0;
  return {
    square: (n) => {
      const key = String(n);
      const cached = cache[key];
      if (cached !== undefined) {
        return cached;
      }
      count++;
      const value = n * n;
      cache[key] = value;
      return value;
    },
    computed: () => count,
  };
}
