// 問5 name と age から、利用者のオブジェクト { name, age } を作る
//     例: makeUser("山田", 30) → { name: "山田", age: 30 }
// 引数と戻り値には型注釈を付けます。
// オブジェクトの型は { name: string; age: number } のように書きます。型に type で名前を付けてもかまいません。
export function makeUser(name: string, age: number): { name: string; age: number } {
  return { name, age };
}
