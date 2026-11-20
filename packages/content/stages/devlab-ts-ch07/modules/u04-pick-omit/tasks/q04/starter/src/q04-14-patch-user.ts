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

// 問14 型 UserPatch を、User の name、email、age だけを、どれも省略できるようにして作る（Partial と Pick）。patchUser(user, patch) は上書きした新しい User を返す
//     例: patchUser(user, { age: 31 }).age → 31
// ここに型 UserPatch と関数 patchUser を書く
