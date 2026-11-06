// 04-q07 never型と網羅性のチェック
//
// 教材: https://typescriptbook.jp/reference/statements/never
//
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

export type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number }
  | { kind: "triangle"; base: number; height: number };

export type TaskStatus = "todo" | "doing" | "review" | "done";

export function assertNever() {}

export function area() {}

export function statusLabel() {}
