// 問14 型 UserPatch を、User の name、email、age だけを、どれも省略できるようにして作る（Partial と Pick）。patchUser(user, patch) は上書きした新しい User を返す
//     例: patchUser(user, { age: 31 }).age → 31
// 引数と戻り値に型注釈を付けます。

export type User = { id: number; name: string; email: string; password: string; age: number };

// ここに型 UserPatch と関数 patchUser を書く
