// 問2 apple は 150、banana は 100、cherry は 500 を返す
//     例: fruitPrice("cherry") → 500
// 引数と戻り値に型注釈を付けます。
// switch で分け、default で用意されている assertNever を呼んだ結果を返します。
export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type Fruit = "apple" | "banana" | "cherry";

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
