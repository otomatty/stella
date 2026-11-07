// 04-q05 例外処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception

// 問16
export function readPort(json: string): number {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("port がありません");
  }
  if (
    typeof data === "object" &&
    data !== null &&
    "port" in data &&
    typeof data.port === "number"
  ) {
    return data.port;
  }
  throw new Error("port がありません");
}
