// 問9 SETTINGS の key の値を返す。key の型は keyof typeof SETTINGS、戻り値は string | number | boolean
//     例: settingValue("fontSize") → 14
// 引数と戻り値に型注釈を付けます。

export const SETTINGS = { theme: "light", fontSize: 14, beta: false };

export function settingValue(key: keyof typeof SETTINGS): string | number | boolean {
  return SETTINGS[key];
}
