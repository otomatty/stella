// 問7 obj の key だけを value にした新しいオブジェクト。value の型は T[K]（そのプロパティの型）に限る
//     例: setProp({ name: "山田", age: 30 }, "age", 31) → { name: "山田", age: 31 }
// 型変数を使い、unknown で型を置き換えないでください。

export function setProp<T, K extends keyof T>(obj: T, key: K, value: T[K]): T {
  return { ...obj, [key]: value };
}
