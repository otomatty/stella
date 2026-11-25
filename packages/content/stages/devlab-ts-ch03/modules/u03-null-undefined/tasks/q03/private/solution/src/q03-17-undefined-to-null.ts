// 問17 undefined なら null に変える
//     例: undefinedToNull(undefined) → null
// 引数と戻り値に型注釈を付ける。
// ?? で、値がない場合を扱う。

export function undefinedToNull(value: string | undefined): string | null {
  return value ?? null;
}
