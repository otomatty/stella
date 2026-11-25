// 問20 順位が 1 なら "金"、2 なら "銀"、3 なら "銅"、それ以外は "なし" を返す
//     例: medal(2) → "銀"
// 引数や戻り値が決まった値だけを取る場合は、リテラル型を | でつないで型注釈を書いてください。
export function medal(rank: number): "金" | "銀" | "銅" | "なし" {
  if (rank === 1) {
    return "金";
  }
  if (rank === 2) {
    return "銀";
  }
  if (rank === 3) {
    return "銅";
  }
  return "なし";
}
