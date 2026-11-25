// 問17 型 TaskStatus（"todo"、"doing"、"done"）を定義して export し、isFinished(status: TaskStatus) を書く。done なら true
//     例: isFinished("done") → true
// 引数と戻り値に型注釈を付ける。
// type と | を使い、リテラル型のユニオンを定義する。

export type TaskStatus = "todo" | "doing" | "done";

export function isFinished(status: TaskStatus): boolean {
  return status === "done";
}
