// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union
//
// 引数と戻り値には型注釈を付けること。
// "表" | "裏" のようなリテラル型のユニオンに type で名前を付けて export し、その型を使って関数を書く。
// 文字列から型の値に変える関数（parse…）は、どれにも当てはまらなければ undefined を返す。

// 問13 型 Theme（"light"、"dark"、"system"）を定義して export し、resolveTheme(theme: Theme, osDark: boolean) を書く。"system" なら OS の設定（osDark が true なら "dark"）に従う。戻り値は "light" | "dark"
//     例: resolveTheme("system", true) → "dark"
// ここに型 Theme と関数 resolveTheme を書く
