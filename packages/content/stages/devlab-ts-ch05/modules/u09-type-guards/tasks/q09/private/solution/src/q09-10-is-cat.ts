// 問10 【型ガード】Pet が猫か。戻り値の型は pet is { kind: "cat"; meow: string }
//     例: isCat({ kind: "cat", meow: "ニャー" }) → true
// ファイル内に定義済みの Pet 型を使ってください。

export type Pet = { kind: "dog"; bark: string } | { kind: "cat"; meow: string };

export function isCat(pet: Pet): pet is { kind: "cat"; meow: string } {
  return pet.kind === "cat";
}
