// 04-q07 never型と網羅性のチェック ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/never

export type Fruit = "apple" | "banana" | "cherry";

// 問14
export function toFruit(text: string): Fruit {
  if (text === "apple" || text === "banana" || text === "cherry") {
    return text;
  }
  throw new Error(`果物ではありません: ${text}`);
}
