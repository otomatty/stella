// 問17 User の形ならそれを、そうでなければ null を返す（型ガード関数を自分で書いて使う）
//     例: toUserOrNull("x") → null
// 定義済みの User 型を使い、型ガード関数の戻り値の型は value is User と書いてください。

export type User = { name: string; age: number };

export function toUserOrNull() {}
