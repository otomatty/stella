// 問19 【型ガード】x と y が数値のオブジェクトか。戻り値の型は value is { x: number; y: number }
//     例: isPoint({ x: 1, y: 2 }) → true

export function isPoint(value: unknown): value is { x: number; y: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "x" in value &&
    "y" in value &&
    typeof value.x === "number" &&
    typeof value.y === "number"
  );
}
