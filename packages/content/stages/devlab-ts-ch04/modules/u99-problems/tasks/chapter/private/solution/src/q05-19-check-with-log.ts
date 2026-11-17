// 04-q05 例外処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception

// 問19
export function checkWithLog(log: string[], text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  } finally {
    log.push("checked");
  }
}
