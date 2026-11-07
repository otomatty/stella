// 07-q04 Pick と Omit ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/pick
//       https://typescriptbook.jp/reference/type-reuse/utility-types/omit
//
// 型 User と Article は定義済みです。
// Pick<T, "a" | "b"> は指定したプロパティだけを取り出した型、Omit<T, "a" | "b"> は指定したプロパティを除いた型。
// 型を書く問題は、プロパティを手で書き並べず、Pick や Omit で作ること。関数は引数と戻り値に型注釈を付けること。
// Omit した型を返す関数は、返すオブジェクトに、除いたプロパティを含めないこと（テストで確かめます）。

export type User = { id: number; name: string; email: string; password: string; age: number };

// 問20 型 UserRow を Pick<User, "id" | "name" | "age"> として作る。toRows(users) で UserRow の配列を id の小さい順に返す
//     例: toRows(users) → [{ id: 1, name: "山田", age: 30 }, …]
// ここに型 UserRow と関数 toRows を書く
