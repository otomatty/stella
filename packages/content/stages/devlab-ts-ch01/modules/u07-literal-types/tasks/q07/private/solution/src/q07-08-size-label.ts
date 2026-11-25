// 問8 "S" なら "小"、"M" なら "中"、"L" なら "大" を返す
//     例: sizeLabel("M") → "中"
// 引数や戻り値が決まった値だけを取る場合は、リテラル型を | でつないで型注釈を書いてください。
export function sizeLabel(size: "S" | "M" | "L"): "小" | "中" | "大" {
  if (size === "S") {
    return "小";
  }
  if (size === "M") {
    return "中";
  }
  return "大";
}
