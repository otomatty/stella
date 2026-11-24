// 問16 省略できる age だけを受け取る。「30歳」、省略したら「年齢不明」
//     例: ageLabel() → "年齢不明"
// 引数と戻り値には型注釈を付けてください。
// 省略できる引数は ? で宣言し、関数の中で ?? や === undefined で省略を扱ってください。

export function ageLabel(age?: number): string {
  return age === undefined ? "年齢不明" : `${age}歳`;
}
