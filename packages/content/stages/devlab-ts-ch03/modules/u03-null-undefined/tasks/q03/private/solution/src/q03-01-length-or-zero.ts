// 問1 文字列か undefined を受け取り、文字数を返す。undefined なら 0
//     例: lengthOrZero(undefined) → 0
// 引数と戻り値に型注釈を付ける。
// ?. と ?? で、値がない場合を扱う。

export function lengthOrZero(text: string | undefined): number {
  return text?.length ?? 0;
}
