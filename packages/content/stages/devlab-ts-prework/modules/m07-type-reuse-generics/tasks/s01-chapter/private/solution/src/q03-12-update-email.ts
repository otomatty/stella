// 07-q03 Partial・Required・Readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/partial
//       https://typescriptbook.jp/reference/type-reuse/utility-types/required
//       https://typescriptbook.jp/reference/type-reuse/utility-types/readonly

export type Profile = { name: string; email?: string; age?: number };

// 問12
export function updateEmail(profile: Readonly<Profile>, email: string): Readonly<Profile> {
  return { ...profile, email };
}
