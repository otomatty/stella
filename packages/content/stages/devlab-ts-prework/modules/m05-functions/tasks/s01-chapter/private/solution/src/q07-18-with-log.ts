// 05-q07 コールバック関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問18
export function withLog(log: string[], fn: (n: number) => number, x: number): number {
  log.push(`call(${x})`);
  return fn(x);
}
