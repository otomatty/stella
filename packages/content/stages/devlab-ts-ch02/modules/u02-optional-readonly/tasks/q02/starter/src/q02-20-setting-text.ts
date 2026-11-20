// 02-q02 オプションプロパティと readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/optional-property
//       https://typescriptbook.jp/reference/values-types-variables/object/readonly-property
//
// 引数と戻り値には型注釈を付けること。
// なくてもよいプロパティは nickname?: string のように ? を付ける。書き換えさせないプロパティには readonly を付ける。
// オプションプロパティの値は undefined かもしれないので、?? や !== undefined で扱う。

// 問20 { darkMode（読み取り専用）, fontSize? } を「ダーク / 16px」の形にする。darkMode が false なら「ライト」、fontSize がなければ 16
//     例: settingText({ darkMode: true }) → "ダーク / 16px"
export function settingText() {}
