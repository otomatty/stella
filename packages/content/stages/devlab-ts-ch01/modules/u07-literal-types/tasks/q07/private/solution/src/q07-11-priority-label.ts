// 問11 優先度 1、2、3 を受け取り、1 なら "高"、2 なら "中"、3 なら "低" を返す
//     例: priorityLabel(1) → "高"
// 引数や戻り値が決まった値だけを取る場合は、リテラル型を | でつないで型注釈を書いてください。
export function priorityLabel(level: 1 | 2 | 3): "高" | "中" | "低" {
  if (level === 1) {
    return "高";
  }
  if (level === 2) {
    return "中";
  }
  return "低";
}
