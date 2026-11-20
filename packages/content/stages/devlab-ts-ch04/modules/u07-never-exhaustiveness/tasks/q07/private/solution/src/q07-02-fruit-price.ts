// 04-q07 never型と網羅性のチェック ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/never

export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type Fruit = "apple" | "banana" | "cherry";

// 問2
export function fruitPrice(fruit: Fruit): number {
  switch (fruit) {
    case "apple":
      return 150;
    case "banana":
      return 100;
    case "cherry":
      return 500;
    default:
      return assertNever(fruit);
  }
}
