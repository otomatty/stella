// 07-q07 型引数の制約 ドリル
//
// 教材: https://typescriptbook.jp/reference/generics/type-parameter-constraint
//
// 次の20問を、型変数を使って書いてください。any や unknown で逃げないこと。
// <T extends { length: number }> は「length を持つ型だけ」、<K extends keyof T> は「T のプロパティ名だけ」、<T extends object> は「オブジェクトだけ」に限る書き方（制約）。
// テストは、制約に合わない呼び出しが型エラーになることも確かめます。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 obj の key のプロパティを返す。key は obj のプロパティ名に限る。戻り値の型は T[K]
//     例: getProp({ name: "山田", age: 30 }, "age") → 30
export function getProp() {}

// 問2 length を持つ値の配列から、length がいちばん短いものを返す（同じなら先の方）。空なら undefined。length を持つ型に限る
//     例: shortest(["abc", "a", "ab"]) → "a"
export function shortest() {}

// 問3 length が長い方を返す（同じなら a）
//     例: longer([1, 2], [3]) → [1, 2]
export function longer() {}

// 問4 それぞれの要素の key の値を並べた配列。戻り値の型は T[K][]
//     例: pluckAll([{ id: 1 }, { id: 2 }], "id") → [1, 2]
export function pluckAll() {}

// 問5 2つのオブジェクトを合わせた新しいオブジェクト。どちらもオブジェクトに限る。戻り値の型は A & B
//     例: mergeObjects({ a: 1 }, { b: "x" }) → { a: 1, b: "x" }
export function mergeObjects() {}

// 問6 オブジェクトに id を足した新しいオブジェクト。戻り値の型は T & { id: number }
//     例: addId({ name: "山田" }, 1) → { name: "山田", id: 1 }
export function addId() {}

// 問7 obj の key だけを value にした新しいオブジェクト。value の型は T[K]（そのプロパティの型）に限る
//     例: setProp({ name: "山田", age: 30 }, "age", 31) → { name: "山田", age: 31 }
export function setProp() {}

// 問8 fn の値がいちばん大きい要素。同じなら先の方。空なら undefined
//     例: maxBy(["a", "abc"], (s) => s.length) → "abc"
export function maxBy() {}

// 問9 fn の値の合計
//     例: sumBy([{ price: 100 }, { price: 50 }], (x) => x.price) → 150
export function sumBy() {}

// 問10 name プロパティを持つものに限り、name の辞書順に並べた新しい配列を返す（localeCompare を使う）
//     例: sortByName([{ name: "b" }, { name: "a" }]) → [{ name: "a" }, { name: "b" }]
export function sortByName() {}

// 問11 age プロパティを持つものに限り、age がいちばん大きい要素を返す。空なら undefined
//     例: oldest([{ name: "a", age: 30 }, { name: "b", age: 41 }]) → { name: "b", age: 41 }
export function oldest() {}

// 問12 fn の値の小さい順に並べた新しい配列（同じなら元の順）
//     例: sortByNumber(["ccc", "a"], (s) => s.length) → ["a", "ccc"]
export function sortByNumber() {}

// 問13 id プロパティを持つものに限り、id が一致する要素を返す。なければ undefined
//     例: findById([{ id: 1, name: "a" }], 1) → { id: 1, name: "a" }
export function findById() {}

// 問14 id が一致する要素だけを patch（Partial<T>）で上書きした新しい配列
//     例: updateById(rows, 1, { name: "z" }) → id 1 の name が "z"
export function updateById() {}

// 問15 predicate が true の要素の数
//     例: countWhere([1, 2, 3], (n) => n > 1) → 2
export function countWhere() {}

// 問16 文字列か数値に限り、value が undefined なら fallback を返す
//     例: orDefault(undefined, 5) → 5
export function orDefault() {}

// 問17 keys のプロパティがすべて undefined でなければ true。keys は readonly (keyof T)[]
//     例: hasAllKeys({ a: 1, b: undefined }, ["a"]) → true
export function hasAllKeys() {}

// 問18 predicate が true の最初の要素。なければ undefined
//     例: firstWhere([1, 4, 6], (n) => n % 2 === 0) → 4
export function firstWhere() {}

// 問19 keyFn(要素) が返すキーごとの数。キーの型は文字列に限る（K extends string）。戻り値は Partial<Record<K, number>>
//     例: countByKey(["apple", "avocado", "banana"], (w) => w.slice(0, 1)) → { a: 2, b: 1 }
export function countByKey() {}

// 問20 id プロパティを持つものに限り、id をキーにした Record<number, T> を返す
//     例: toIdMap([{ id: 1, name: "a" }]) → { 1: { id: 1, name: "a" } }
export function toIdMap() {}
