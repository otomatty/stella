// 問11 年上の方の名前を返す。同じ年齢なら a の名前
//     例: olderName(ミケ, ポチ) → "ポチ"
// 引数と戻り値には型注釈を付けます。

export type Cat = { name: string; age: number; meow: string };

export type Dog = { name: string; age: number; breed: string };

export function olderName(
  a: { name: string; age: number },
  b: { name: string; age: number },
): string {
  return b.age > a.age ? b.name : a.name;
}
