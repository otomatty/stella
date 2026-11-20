// 02-q02 オプションプロパティと readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/optional-property
//       https://typescriptbook.jp/reference/values-types-variables/object/readonly-property
//
// 引数と戻り値には型注釈を付けること。
// なくてもよいプロパティは nickname?: string のように ? を付ける。書き換えさせないプロパティには readonly を付ける。
// オプションプロパティの値は undefined かもしれないので、?? や !== undefined で扱う。

// 問8 ToDo { id（読み取り専用）, title, done } の done を true にした、新しい ToDo を返す（元は変えない）
//     例: completeTodo({ id: 1, title: "買い物", done: false }) → { id: 1, title: "買い物", done: true }
export function completeTodo() {}
