// 05-q09 型ガード関数とアサーション関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/type-guard-functions
//       https://typescriptbook.jp/reference/functions/assertion-functions

export type Pet = { kind: "dog"; bark: string } | { kind: "cat"; meow: string };

// 問9
export function isDog(pet: Pet): pet is { kind: "dog"; bark: string } {
  return pet.kind === "dog";
}
