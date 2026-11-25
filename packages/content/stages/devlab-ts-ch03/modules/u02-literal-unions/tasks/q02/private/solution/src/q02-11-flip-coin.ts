// 問11 型 Coin（"表" か "裏"）を定義して export し、flipCoin(coin: Coin) を書く。反対の面を返す
//     例: flipCoin("表") → "裏"
// 引数と戻り値に型注釈を付ける。
// type と | を使い、リテラル型のユニオンを定義する。

export type Coin = "表" | "裏";

export function flipCoin(coin: Coin): Coin {
  return coin === "表" ? "裏" : "表";
}
