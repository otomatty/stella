// 問14 2人の User で値が違うプロパティ名を、id、name、email、age の順で返す
//     例: differentKeys(a, b) → ["age"]
// 引数と戻り値に型注釈を付けます。
// 戻り値の型に keyof User を使います。

export type User = { id: number; name: string; email: string; age: number };

export function differentKeys() {}
