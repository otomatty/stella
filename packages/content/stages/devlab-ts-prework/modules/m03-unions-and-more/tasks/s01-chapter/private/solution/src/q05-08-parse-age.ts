// 03-q05 成功と失敗を表す型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Result = { ok: true; value: number } | { ok: false; error: string };

// 問8
export function parseAge(text: string): Result {
  const age = Number(text);
  if (text.trim() === "" || !Number.isInteger(age) || age < 0 || age > 150) {
    return { ok: false, error: `年齢ではありません: ${text}` };
  }
  return { ok: true, value: age };
}
