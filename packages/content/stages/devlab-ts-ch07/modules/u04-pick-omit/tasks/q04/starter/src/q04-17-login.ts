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

// 問17 型 Credentials を Pick<User, "email" | "password"> として作る。login(users, credentials) は、email と password が一致する User を、password を除いて返す。いなければ undefined
//     例: login(users, { email: "y@example.com", password: "x" }) → password のない山田
// ここに型 Credentials と関数 login を書く
