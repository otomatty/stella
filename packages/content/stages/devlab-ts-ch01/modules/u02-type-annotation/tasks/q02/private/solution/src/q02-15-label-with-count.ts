// 問15 ラベルの後ろに件数を「（◯件）」の形で付ける
//     例: labelWithCount("メッセージ", 3) → "メッセージ（3件）"
// 戻り値には型注釈を付けてください。
export function labelWithCount(label: string, count: number): string {
  return `${label}（${count}件）`;
}
