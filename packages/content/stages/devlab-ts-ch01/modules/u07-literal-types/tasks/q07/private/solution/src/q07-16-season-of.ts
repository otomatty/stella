// 問16 月（1〜12）から季節を返す。3〜5月は "春"、6〜8月は "夏"、9〜11月は "秋"、それ以外は "冬"
//     例: seasonOf(4) → "春"
// 引数や戻り値が決まった値だけを取る場合は、リテラル型を | でつないで型注釈を書いてください。
export function seasonOf(month: number): "春" | "夏" | "秋" | "冬" {
  if (month >= 3 && month <= 5) {
    return "春";
  }
  if (month >= 6 && month <= 8) {
    return "夏";
  }
  if (month >= 9 && month <= 11) {
    return "秋";
  }
  return "冬";
}
