// 問題
// 図形を表す型 Shape と、タスクの状態を表す型 TaskStatus は定義済みです。
//
// 1. assertNever(value) を書いてください
//    引数の型は never、戻り値の型も never。呼ばれたら Error を投げる（メッセージは自由）。
//    switch の default でこれを呼ぶと、case の書き忘れが型エラーで分かるようになる
//
// 2. area(shape) を書いてください。面積を返す
//    円は Math.PI × 半径 × 半径、正方形は 1辺 × 1辺、三角形は 底辺 × 高さ ÷ 2。
//    switch で kind ごとに分け、default では assertNever(shape) を返すこと
//
// 3. statusLabel(status) を書いてください
//    "todo" は "未着手"、"doing" は "作業中"、"review" は "確認待ち"、"done" は "完了"。
//    同じく switch の default で assertNever を使うこと
//
// 説明すること（答えは、この下に // のコメントで書く）
// - TaskStatus に "archived" を足すと、どこにどんなエラーが出るか（試したら元に戻す）

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
