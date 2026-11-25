// 問12 Readonly<Profile> を受け取り、email だけを変えた新しい Readonly<Profile> を返す（元は変えない）
//     例: updateEmail(profile, "new@example.com").email → "new@example.com"
// 引数と戻り値に型注釈を付けます。

export type Profile = { name: string; email?: string; age?: number };

export function updateEmail() {}
