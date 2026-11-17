// 07-q02 keyof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/keyof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types

export const COLOR_CODES = { red: "#ff0000", green: "#00ff00", blue: "#0000ff" } as const;

// 問10
export function colorCode(name: keyof typeof COLOR_CODES): string {
  return COLOR_CODES[name];
}
