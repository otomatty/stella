// 問13 引数の位置で分割代入して（function greetByName({ name }: User)）、「こんにちは、山田さん」を返す
//     例: greetByName(山田) → "こんにちは、山田さん"
// 引数と戻り値には型注釈を付けます。
// 定義済みの User 型を使います。

export type User = { id: number; name: string; age: number; email: string };

export function greetByName() {}
