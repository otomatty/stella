// 07-q03 Partial・Required・Readonly
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/partial
//       https://typescriptbook.jp/reference/type-reuse/utility-types/required
//       https://typescriptbook.jp/reference/type-reuse/utility-types/readonly
//
// 問題
// ユーティリティ型を使うと、ある型をもとに、少しだけ違う型を作れます。
//   Partial<T>: すべてのプロパティを省略できるようにした型
//   Required<T>: すべてのプロパティを省略できないようにした型
//   Readonly<T>: すべてのプロパティを読み取り専用にした型
// 型 Profile は定義済みです。
//
// 1. updateProfile(profile, patch) を書く。patch は Partial<Profile>。patch で上書きした新しい Profile を返す
//
// 2. completeProfile(draft) を書く。draft は Partial<Profile>。すべてそろっていれば Required<Profile> として返す。
//    足りないものがあれば、name、email、bio、age の順で最初に見つかったものについて "<名前> がありません" の Error を投げる
//
// 3. freezeProfile(profile) を書く。コピーを Object.freeze して、Readonly<Profile> として返す
//
// 4. changedKeys(before, after) を書く。値が違うプロパティ名を、name、email、bio、age の順で並べて返す。
//    戻り値は (keyof Profile)[]

export type Profile = { name: string; email: string; bio: string; age: number };

export function updateProfile() {}

export function completeProfile() {}

export function freezeProfile() {}

export function changedKeys() {}
