// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問11
export type Coin = "表" | "裏";

export function flipCoin(coin: Coin): Coin {
  return coin === "表" ? "裏" : "表";
}
