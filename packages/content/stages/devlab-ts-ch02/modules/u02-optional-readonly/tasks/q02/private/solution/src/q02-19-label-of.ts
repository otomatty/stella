// 問19 { id, label? } の label を返す。なければ「#id」
//     例: labelOf({ id: 7 }) → "#7"
// 引数と戻り値には型注釈を付けます。
// 値が省略されている場合は、?? で補えます。
export function labelOf(item: { id: number; label?: string }): string {
  return item.label ?? `#${item.id}`;
}
