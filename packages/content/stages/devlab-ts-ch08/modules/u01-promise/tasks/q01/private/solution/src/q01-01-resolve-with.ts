// 問1 value ですぐに解決する Promise を返す（Promise.resolve）
//     例: resolveWith("a") → "a" で解決する Promise
// async と await を使わずに書いてください。
// 引数と戻り値に型注釈を付け、Promise の中身の型まで書いてください。

export function resolveWith(value: string): Promise<string> {
  return Promise.resolve(value);
}
