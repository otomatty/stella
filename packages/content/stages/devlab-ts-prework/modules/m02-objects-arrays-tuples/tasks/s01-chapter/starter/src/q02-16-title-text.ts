// 02-q02 オプションプロパティと readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/optional-property
//       https://typescriptbook.jp/reference/values-types-variables/object/readonly-property
//
// 引数と戻り値には型注釈を付けること。
// なくてもよいプロパティは nickname?: string のように ? を付ける。書き換えさせないプロパティには readonly を付ける。
// オプションプロパティの値は undefined かもしれないので、?? や !== undefined で扱う。

// 問16 { title, subtitle? } を、subtitle があれば「title: subtitle」、なければ「title」にする
//     例: titleText({ title: "入門", subtitle: "TypeScript" }) → "入門: TypeScript"
export function titleText() {}
