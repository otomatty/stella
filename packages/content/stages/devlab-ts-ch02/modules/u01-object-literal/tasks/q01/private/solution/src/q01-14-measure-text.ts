// 問14 測定値 { value, unit } を、値と単位をつないだ文字列にする
//     例: measureText({ value: 25, unit: "℃" }) → "25℃"
// 引数と戻り値には型注釈を付けます。
// オブジェクトの型は { name: string; age: number } のように書きます。型に type で名前を付けてもかまいません。
export function measureText(measure: { value: number; unit: string }): string {
  return `${measure.value}${measure.unit}`;
}
