// 07-q03 Partial・Required・Readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/partial
//       https://typescriptbook.jp/reference/type-reuse/utility-types/required
//       https://typescriptbook.jp/reference/type-reuse/utility-types/readonly
//
// 型 Options と Profile は定義済みです。
// Partial<T> はすべてを省略できる型、Required<T> はすべてを省略できない型、Readonly<T> はすべてを読み取り専用にした型。
// 型を書く問題は、プロパティを手で書き並べず、ユーティリティ型で作ること。関数は引数と戻り値に型注釈を付けること。

export type Profile = { name: string; email?: string; age?: number };

// 問7 Profile の足りないところを、email は ""、age は 0 で補って Required<Profile> を返す
//     例: completeProfile({ name: "山田" }) → { name: "山田", email: "", age: 0 }
export function completeProfile() {}
