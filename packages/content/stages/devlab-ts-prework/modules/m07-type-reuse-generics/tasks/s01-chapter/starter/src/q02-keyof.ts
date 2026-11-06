// 07-q02 keyof 型演算子
//
// 教材: https://typescriptbook.jp/reference/type-reuse/keyof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types
//
// 問題
// keyof 型 と書くと、その型のプロパティ名のユニオン型になります。型 User は定義済みです。
//
// 1. 型 UserKey を keyof で作って export する（"id" | "name" | "email" | "age" になる）
//
// 2. getField(user, key) を書く。key は UserKey。user のそのプロパティの値を返す。戻り値は string | number
//
// 3. fieldsText(user, keys) を書く。keys は readonly UserKey[]。"name=山田, age=30" の形にする
//
// 4. sortUsers(users, key) を書く。key のプロパティの値で、小さい順（文字列は辞書順）に並べた新しい配列を返す。
//    引数の配列は readonly User[]。同じ値なら元の順
//
// 5. isUserKey(text) を書く。UserKey のどれかなら true。戻り値の型は text is UserKey

export type User = { id: number; name: string; email: string; age: number };

export type UserKey = unknown;

export function getField() {}

export function fieldsText() {}

export function sortUsers() {}

export function isUserKey() {}
