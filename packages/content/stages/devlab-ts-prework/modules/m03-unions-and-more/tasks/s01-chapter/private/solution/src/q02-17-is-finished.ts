// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問17
export type TaskStatus = "todo" | "doing" | "done";

export function isFinished(status: TaskStatus): boolean {
  return status === "done";
}
