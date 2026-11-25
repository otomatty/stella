// 問4 { age? } を「◯歳」にする。age がなければ「年齢不明」
//     例: ageText({ age: 30 }) → "30歳"
// 引数と戻り値には型注釈を付けます。
// 値が省略されたかどうかは undefined と比較して確かめます。
export function ageText(person: { age?: number }): string {
  return person.age === undefined ? "年齢不明" : `${person.age}歳`;
}
