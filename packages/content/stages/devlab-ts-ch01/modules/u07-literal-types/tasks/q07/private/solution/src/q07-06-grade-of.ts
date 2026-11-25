// 問6 80点以上は "A"、60点以上は "B"、それ未満は "C" を返す
//     例: gradeOf(75) → "B"
// 引数や戻り値が決まった値だけを取る場合は、リテラル型を | でつないで型注釈を書いてください。
export function gradeOf(score: number): "A" | "B" | "C" {
  if (score >= 80) {
    return "A";
  }
  if (score >= 60) {
    return "B";
  }
  return "C";
}
