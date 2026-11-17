// 04-q05 例外処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception

// 問18
export function loadSettings(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("設定を読めません", { cause: error });
  }
}
