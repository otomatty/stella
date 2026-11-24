// 問13 型 Vehicle（{ type: "car"; seats } か { type: "bike" }）を定義して export し、capacity(vehicle: Vehicle) を書く。car は seats、bike は 1
//     例: capacity({ type: "bike" }) → 1
// 引数と戻り値に型注釈を付ける。
// type と | を使い、判別可能なユニオン型を定義する。

export type Vehicle = { type: "car"; seats: number } | { type: "bike" };

export function capacity(vehicle: Vehicle): number {
  return vehicle.type === "car" ? vehicle.seats : 1;
}
