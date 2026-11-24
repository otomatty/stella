// 問2 name の文字数を返す
//     例: nameLength(ポチ) → 2
// 引数と戻り値には型注釈を付けます。

export type Dog = { name: string; age: number; breed: string };

export function nameLength(x: { name: string }): number {
  return x.name.length;
}
