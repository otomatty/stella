// 02-q02 オプションプロパティと readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/optional-property
//       https://typescriptbook.jp/reference/values-types-variables/object/readonly-property
//
// 引数と戻り値には型注釈を付けること。
// なくてもよいプロパティは nickname?: string のように ? を付ける。書き換えさせないプロパティには readonly を付ける。
// オプションプロパティの値は undefined かもしれないので、?? や !== undefined で扱う。

// 問1 { name, nickname? } を受け取り、nickname があれば nickname、なければ name を使って「こんにちは、◯◯さん」を返す
//     例: greetUser({ name: "山田太郎", nickname: "たろう" }) → "こんにちは、たろうさん"
export function greetUser() {}
