// 05-q02 引数と戻り値の型、void ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-parameters
//       https://typescriptbook.jp/reference/functions/void-type
//       https://typescriptbook.jp/reference/functions/pass-by-value

// 問11
export function parsePort(text: string): number | undefined {
  const n = Number(text);
  if (text.trim() === "" || !Number.isInteger(n) || n < 1 || n > 65535) {
    return undefined;
  }
  return n;
}
