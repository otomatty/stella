// 問9 【型ガード】Pet が犬か。戻り値の型は pet is { kind: "dog"; bark: string }
//     例: isDog({ kind: "dog", bark: "ワン" }) → true
// ファイル内に定義済みの Pet 型を使ってください。

export type Pet = { kind: "dog"; bark: string } | { kind: "cat"; meow: string };

export function isDog(pet: Pet): pet is { kind: "dog"; bark: string } {
  return pet.kind === "dog";
}
