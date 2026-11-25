// 問16 null なら undefined に変える
//     例: nullToUndefined(null) → undefined
// 引数と戻り値に型注釈を付ける。
// ?? で、値がない場合を扱う。

export function nullToUndefined(value: string | null): string | undefined {
  return value ?? undefined;
}
