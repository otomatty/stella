// 04-q05 例外処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception

// 問4
export function itemAt(items: readonly string[], index: number): string {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`範囲外です: ${index}`);
  }
  return item;
}
