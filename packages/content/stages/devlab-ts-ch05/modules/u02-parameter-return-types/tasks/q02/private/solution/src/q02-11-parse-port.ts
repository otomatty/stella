// 問11 1〜65535 の整数の文字列ならその数値、そうでなければ undefined を返す
//     例: parsePort("8080") → 8080
// 引数と戻り値には型注釈を付けてください。

export function parsePort(text: string): number | undefined {
  const n = Number(text);
  if (text.trim() === "" || !Number.isInteger(n) || n < 1 || n > 65535) {
    return undefined;
  }
  return n;
}
