// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

// 問13
export type Vehicle = { type: "car"; seats: number } | { type: "bike" };

export function capacity(vehicle: Vehicle): number {
  return vehicle.type === "car" ? vehicle.seats : 1;
}
