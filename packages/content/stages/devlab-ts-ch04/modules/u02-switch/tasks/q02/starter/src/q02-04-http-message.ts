// 04-q02 switch文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/switch
//       https://typescriptbook.jp/reference/statements/switch-fallthrough
//
// switch 文で書いてください。引数と戻り値には型注釈を付けること。
// 同じ処理にしたい case は、case 3: case 4: case 5: のように並べる。
// 引数がユニオン型なら、すべての case を書く（ESLint の switch-exhaustiveness-check）。数値や文字列なら default を書く。

// 問4 200 は "OK"、201 は "Created"、404 は "Not Found"、500 は "Internal Server Error"、それ以外は "Unknown"
//     例: httpMessage(404) → "Not Found"
export function httpMessage() {}
