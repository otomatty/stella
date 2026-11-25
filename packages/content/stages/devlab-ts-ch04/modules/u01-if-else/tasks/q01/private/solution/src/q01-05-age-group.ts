// 問5 18歳未満は "子ども"、65歳未満は "大人"、それ以上は "シニア"
//     例: ageGroup(70) → "シニア"
// 引数と戻り値に型注釈を付けます。
// if-else 文で分けます。短い場合は三項演算子でも構いません。
export function ageGroup(age: number): "子ども" | "大人" | "シニア" {
  if (age < 18) {
    return "子ども";
  }
  if (age < 65) {
    return "大人";
  }
  return "シニア";
}
