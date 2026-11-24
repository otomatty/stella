// 問16 apple は "🍎"、banana は "🍌"、cherry は "🍒" を返す
//     例: fruitEmoji("cherry") → "🍒"
// 引数と戻り値に型注釈を付けます。
// switch で分け、default で用意されている assertNever を呼んだ結果を返します。
export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type Fruit = "apple" | "banana" | "cherry";

export function fruitEmoji() {}
