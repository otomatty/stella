// 問10 { name, age } を「山田（30）」にする。age を省略したら「山田（?）」
//     例: userLabel({ name: "山田" }) → "山田（?）"
// 引数と戻り値には型注釈を付けてください。
// オブジェクトは引数の位置で分割代入してください。

export function userLabel({ name, age }: { name: string; age?: number }): string {
  return `${name}（${age ?? "?"}）`;
}
