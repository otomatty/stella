// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

// 問12
export type Animal = { kind: "dog"; name: string } | { kind: "cat"; name: string };

export function cry(animal: Animal): string {
  return `${animal.name}: ${animal.kind === "dog" ? "ワン" : "ニャー"}`;
}
