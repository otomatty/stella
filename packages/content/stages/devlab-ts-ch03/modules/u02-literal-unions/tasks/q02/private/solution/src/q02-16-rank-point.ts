// 問16 型 Rank（"gold"、"silver"、"bronze"）を定義して export し、rankPoint(rank: Rank) を書く。gold 3、silver 2、bronze 1
//     例: rankPoint("silver") → 2
// 引数と戻り値に型注釈を付ける。
// type と | を使い、リテラル型のユニオンを定義する。

export type Rank = "gold" | "silver" | "bronze";

export function rankPoint(rank: Rank): number {
  if (rank === "gold") {
    return 3;
  }
  if (rank === "silver") {
    return 2;
  }
  return 1;
}
