// 問12 型 Animal（{ kind: "dog"; name } か { kind: "cat"; name }）を定義して export し、cry(animal: Animal) を書く。「ポチ: ワン」「ミケ: ニャー」
//     例: cry({ kind: "dog", name: "ポチ" }) → "ポチ: ワン"
// 引数と戻り値に型注釈を付ける。
// type と | を使い、判別可能なユニオン型を定義する。

export type Animal = { kind: "dog"; name: string } | { kind: "cat"; name: string };

export function cry(animal: Animal): string {
  return `${animal.name}: ${animal.kind === "dog" ? "ワン" : "ニャー"}`;
}
