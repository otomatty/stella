// 07-e01 発展問題 Mapped Types
//
// 教材: https://typescriptbook.jp/reference/type-reuse/mapped-types
//
// 問題
// { [K in keyof T]: … } と書くと、T のすべてのプロパティについて、値の型を作り変えた型を作れます（Mapped Types）。
// Partial や Readonly も、この書き方で作られています。次の型と関数を書いて export してください。
//
// 1. 型 Nullable<T>: T のすべてのプロパティの値を「元の型 | null」にした型
//
// 2. 型 Flags<T>: T のすべてのプロパティの値を boolean にした型
//
// 3. 型 Getters<T>: T のすべてのプロパティを、値を返す関数（() => 元の型）にした型
//
// 4. allFlags(obj, value): obj と同じキーを持ち、値がすべて value の Flags を返す。T はオブジェクトに限る
//    例: allFlags({ name: "山田", age: 30 }, true) → { name: true, age: true }
//    ヒント: Object.keys の結果は string[] なので、型を合わせるには工夫が要る。
//           結果のオブジェクトを Partial<Flags<T>> で作り、最後に必要な型にする方法などがある
//
// 5. toNullable(obj): obj と同じ中身の Nullable<T> を返す（コピーを返す）

export type Nullable = unknown;
export type Flags = unknown;
export type Getters = unknown;

export function allFlags() {}

export function toNullable() {}
