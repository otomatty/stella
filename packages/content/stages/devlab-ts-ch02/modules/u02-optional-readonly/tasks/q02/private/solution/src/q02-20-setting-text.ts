// 問20 { darkMode（読み取り専用）, fontSize? } を「ダーク / 16px」の形にする。darkMode が false なら「ライト」、fontSize がなければ 16
//     例: settingText({ darkMode: true }) → "ダーク / 16px"
// 引数と戻り値には型注釈を付けます。
// 値が省略されている場合は、?? で補えます。
export function settingText(setting: { readonly darkMode: boolean; fontSize?: number }): string {
  return `${setting.darkMode ? "ダーク" : "ライト"} / ${setting.fontSize ?? 16}px`;
}
