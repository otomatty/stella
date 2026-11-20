// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Notice =
  | { type: "info"; message: string }
  | { type: "warning"; message: string; level: number }
  | { type: "error"; message: string; code: number };

// 問10
export function isSerious(notice: Notice): boolean {
  switch (notice.type) {
    case "info":
      return false;
    case "warning":
      return notice.level >= 3;
    case "error":
      return true;
  }
}
