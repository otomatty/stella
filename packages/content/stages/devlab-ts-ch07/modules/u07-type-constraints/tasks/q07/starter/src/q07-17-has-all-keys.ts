// 問17 keys のプロパティがすべて undefined でなければ true。keys は readonly (keyof T)[]
//     例: hasAllKeys({ a: 1, b: undefined }, ["a"]) → true
// 型変数を使い、unknown で型を置き換えないでください。
// obj の型は T extends object でオブジェクトに限ります。

export function hasAllKeys() {}
