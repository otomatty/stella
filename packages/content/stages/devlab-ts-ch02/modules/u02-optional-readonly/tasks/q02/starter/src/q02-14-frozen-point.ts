// 02-q02 オプションプロパティと readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/optional-property
//       https://typescriptbook.jp/reference/values-types-variables/object/readonly-property
//
// 引数と戻り値には型注釈を付けること。
// なくてもよいプロパティは nickname?: string のように ? を付ける。書き換えさせないプロパティには readonly を付ける。
// オプションプロパティの値は undefined かもしれないので、?? や !== undefined で扱う。

// 問14 x と y から、どちらも読み取り専用の座標 { x, y } を作る
//     例: frozenPoint(1, 2) → { x: 1, y: 2 }
export function frozenPoint() {}
