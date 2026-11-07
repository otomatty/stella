// 04-q01 if-else文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/if-else
//       https://typescriptbook.jp/reference/statements/ternary-operator

// 問12
export function quadrant(x: number, y: number): 0 | 1 | 2 | 3 | 4 {
  if (x === 0 || y === 0) {
    return 0;
  }
  if (x > 0) {
    return y > 0 ? 1 : 4;
  }
  return y > 0 ? 2 : 3;
}
