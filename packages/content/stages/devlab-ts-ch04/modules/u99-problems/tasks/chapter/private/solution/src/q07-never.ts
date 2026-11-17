// "archived" を足すと、statusLabel の default で assertNever(status) に "archived" が渡り、
// 「型 '"archived"' の引数を型 'never' のパラメーターに割り当てることはできません」というエラーになる
export type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number }
  | { kind: "triangle"; base: number; height: number };

export type TaskStatus = "todo" | "doing" | "review" | "done";

export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius * shape.radius;
    case "square":
      return shape.size * shape.size;
    case "triangle":
      return (shape.base * shape.height) / 2;
    default:
      return assertNever(shape);
  }
}

export function statusLabel(status: TaskStatus): string {
  switch (status) {
    case "todo":
      return "未着手";
    case "doing":
      return "作業中";
    case "review":
      return "確認待ち";
    case "done":
      return "完了";
    default:
      return assertNever(status);
  }
}
