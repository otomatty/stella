// 問2 【型ガード】NaN でない数値か。戻り値の型は value is number
//     例: isNum(NaN) → false

export function isNum(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}
