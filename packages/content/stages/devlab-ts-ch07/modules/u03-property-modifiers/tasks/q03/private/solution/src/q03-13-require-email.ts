// 問13 email を返す。なければ "email がありません" の Error を投げる
//     例: requireEmail({ name: "山田" }) → Error
// 引数と戻り値に型注釈を付けます。

export type Profile = { name: string; email?: string; age?: number };

export function requireEmail(profile: Profile): string {
  if (profile.email === undefined) {
    throw new Error("email がありません");
  }
  return profile.email;
}
