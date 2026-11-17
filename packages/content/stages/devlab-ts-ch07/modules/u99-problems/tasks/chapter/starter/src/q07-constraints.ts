// 07-q07 型引数の制約
//
// 教材: https://typescriptbook.jp/reference/generics/type-parameter-constraint
//
// 問題
// <T extends { length: number }> のように書くと、T に渡せる型を「length を持つ型」に限れます。
// そのおかげで、関数の中で T の値の length を使えるようになります。
// <K extends keyof T> と書くと、K を「T のプロパティ名のどれか」に限れます。
//
// 1. getProperty(obj, key): obj[key] を返す。key は obj のプロパティ名に限る。戻り値の型は T[K]
//    例: getProperty({ name: "山田", age: 30 }, "age") → 30（型は number）
//
// 2. longest(a, b): length が長い方を返す（同じなら a）。length を持つ型に限る
//    例: longest("abc", "de") → "abc"、longest([1, 2], [3]) → [1, 2]
//
// 3. pluck(items, key): それぞれの要素の key の値を並べた配列を返す。戻り値の型は T[K][]
//    例: pluck([{ id: 1 }, { id: 2 }], "id") → [1, 2]
//
// 4. withId(value, id): オブジェクトに id を足した新しいオブジェクトを返す。オブジェクトに限る（T extends object）。
//    戻り値の型は T & { id: number }
//
// テストは、制約に合わない呼び出しが型エラーになることも確かめます

export function getProperty() {}

export function longest() {}

export function pluck() {}

export function withId() {}
