// 05-q09 型ガード関数とアサーション関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/type-guard-functions
//       https://typescriptbook.jp/reference/functions/assertion-functions

export type Pet = { kind: "dog"; bark: string } | { kind: "cat"; meow: string };

// 問10
export function isCat(pet: Pet): pet is { kind: "cat"; meow: string } {
  return pet.kind === "cat";
}
