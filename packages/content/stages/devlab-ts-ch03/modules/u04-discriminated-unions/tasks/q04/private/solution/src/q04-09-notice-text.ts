// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Notice =
  | { type: "info"; message: string }
  | { type: "warning"; message: string; level: number }
  | { type: "error"; message: string; code: number };

// 問9
export function noticeText(notice: Notice): string {
  switch (notice.type) {
    case "info":
      return `[情報] ${notice.message}`;
    case "warning":
      return `[注意Lv${notice.level}] ${notice.message}`;
    case "error":
      return `[エラー${notice.code}] ${notice.message}`;
  }
}
