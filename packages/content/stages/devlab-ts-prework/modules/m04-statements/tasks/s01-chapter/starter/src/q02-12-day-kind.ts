// 04-q02 switch文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/switch
//       https://typescriptbook.jp/reference/statements/switch-fallthrough
//
// switch 文で書いてください。引数と戻り値には型注釈を付けること。
// 同じ処理にしたい case は、case 3: case 4: case 5: のように並べる。
// 引数がユニオン型なら、すべての case を書く（ESLint の switch-exhaustiveness-check）。数値や文字列なら default を書く。

// 問12 "月"〜"金" は "平日"、"土" と "日" は "週末"、それ以外は Error を投げる
//     例: dayKind("土") → "週末"
export function dayKind() {}
