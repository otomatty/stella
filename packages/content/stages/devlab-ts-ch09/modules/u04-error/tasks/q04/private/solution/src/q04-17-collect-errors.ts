// 09-q04 Error ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/error
//       https://typescriptbook.jp/reference/statements/exception

// 問17
export function collectErrors(fns: (() => void)[]): string[] {
  const messages: string[] = [];
  for (const fn of fns) {
    try {
      fn();
    } catch (error) {
      messages.push(error instanceof Error ? error.message : "不明なエラー");
    }
  }
  return messages;
}
