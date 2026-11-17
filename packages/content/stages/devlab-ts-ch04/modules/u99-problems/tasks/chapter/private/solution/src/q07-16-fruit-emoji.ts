// 04-q07 never型と網羅性のチェック ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/never

export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type Fruit = "apple" | "banana" | "cherry";

// 問16
export function fruitEmoji(fruit: Fruit): "🍎" | "🍌" | "🍒" {
  switch (fruit) {
    case "apple":
      return "🍎";
    case "banana":
      return "🍌";
    case "cherry":
      return "🍒";
    default:
      return assertNever(fruit);
  }
}
