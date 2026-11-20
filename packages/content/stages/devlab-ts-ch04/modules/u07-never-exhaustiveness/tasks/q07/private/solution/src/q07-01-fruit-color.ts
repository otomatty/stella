// 04-q07 never型と網羅性のチェック ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/never

export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type Fruit = "apple" | "banana" | "cherry";

// 問1
export function fruitColor(fruit: Fruit): string {
  switch (fruit) {
    case "apple":
      return "赤";
    case "banana":
      return "黄";
    case "cherry":
      return "赤";
    default:
      return assertNever(fruit);
  }
}
