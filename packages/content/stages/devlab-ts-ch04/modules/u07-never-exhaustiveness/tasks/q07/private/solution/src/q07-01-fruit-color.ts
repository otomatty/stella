// 問1 apple は "赤"、banana は "黄"、cherry は "赤" を返す
//     例: fruitColor("banana") → "黄"
// 引数と戻り値に型注釈を付けます。
// switch で分け、default で用意されている assertNever を呼んだ結果を返します。
export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type Fruit = "apple" | "banana" | "cherry";

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
