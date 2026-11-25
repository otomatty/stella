// 問3 来年の年齢を返す。Cat でも Dog でも渡せる
//     例: ageNextYear(ミケ) → 4
// 引数と戻り値には型注釈を付けます。

export type Cat = { name: string; age: number; meow: string };

export type Dog = { name: string; age: number; breed: string };

export function ageNextYear(x: { age: number }): number {
  return x.age + 1;
}
