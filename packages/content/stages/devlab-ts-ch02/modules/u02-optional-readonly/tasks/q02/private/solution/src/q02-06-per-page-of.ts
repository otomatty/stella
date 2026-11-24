// 問6 { perPage? } の perPage を返す。なければ 20
//     例: perPageOf({}) → 20
// 引数と戻り値には型注釈を付けます。
// 値が省略されている場合は、?? で補えます。
export function perPageOf(options: { perPage?: number }): number {
  return options.perPage ?? 20;
}
