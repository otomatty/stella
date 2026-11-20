// 03-q05 成功と失敗を表す型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Result = { ok: true; value: number } | { ok: false; error: string };

// 問16
export function parsePercent(text: string): Result {
  const body = text.slice(0, -1);
  const value = Number(body);
  if (!text.endsWith("%") || body === "" || Number.isNaN(value)) {
    return { ok: false, error: `割合ではありません: ${text}` };
  }
  return { ok: true, value };
}
