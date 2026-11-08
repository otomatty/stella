// 04-q05 例外処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception

// 問12
export function toBigIntOrNull(text: string): bigint | null {
  try {
    return BigInt(text);
  } catch {
    return null;
  }
}
