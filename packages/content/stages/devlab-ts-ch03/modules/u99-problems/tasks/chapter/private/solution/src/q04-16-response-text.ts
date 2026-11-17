// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

// 問16
export type ApiResponse = { ok: true; data: string } | { ok: false; status: number };

export function responseText(response: ApiResponse): string {
  return response.ok ? response.data : `エラー ${response.status}`;
}
