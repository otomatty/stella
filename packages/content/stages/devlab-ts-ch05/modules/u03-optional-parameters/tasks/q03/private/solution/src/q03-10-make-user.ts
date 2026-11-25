// 問10 name と、省略できる age。{ name, age? } を返す。age を省略したら age を付けない
//     例: makeUser("山田") → { name: "山田" }
// 引数と戻り値には型注釈を付けてください。
// 省略できる引数は ? で宣言し、関数の中で ?? や === undefined で省略を扱ってください。

export function makeUser(name: string, age?: number): { name: string; age?: number } {
  return age === undefined ? { name } : { name, age };
}
