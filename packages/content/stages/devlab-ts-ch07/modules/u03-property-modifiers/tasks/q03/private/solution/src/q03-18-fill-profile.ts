// 問18 profile の足りないところを defaults（Required<Profile>）で補った Required<Profile> を返す
//     例: fillProfile({ name: "山田" }, { name: "", email: "-", age: 0 }) → { name: "山田", email: "-", age: 0 }
// 引数と戻り値に型注釈を付けます。

export type Profile = { name: string; email?: string; age?: number };

export function fillProfile(profile: Profile, defaults: Required<Profile>): Required<Profile> {
  return {
    name: profile.name,
    email: profile.email ?? defaults.email,
    age: profile.age ?? defaults.age,
  };
}
