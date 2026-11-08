// 07-q03 Partial・Required・Readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/partial
//       https://typescriptbook.jp/reference/type-reuse/utility-types/required
//       https://typescriptbook.jp/reference/type-reuse/utility-types/readonly

export type Profile = { name: string; email?: string; age?: number };

// 問18
export function fillProfile(profile: Profile, defaults: Required<Profile>): Required<Profile> {
  return {
    name: profile.name,
    email: profile.email ?? defaults.email,
    age: profile.age ?? defaults.age,
  };
}
