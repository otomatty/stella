// 問6 利用者 { name, age } が18歳以上なら true
//     例: isAdultUser({ name: "山田", age: 30 }) → true
// 引数と戻り値には型注釈を付けます。
// オブジェクトの型は { name: string; age: number } のように書きます。型に type で名前を付けてもかまいません。
export function isAdultUser(user: { name: string; age: number }): boolean {
  return user.age >= 18;
}
