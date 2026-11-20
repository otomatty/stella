// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union
//
// 引数と戻り値には型注釈を付けること。
// "表" | "裏" のようなリテラル型のユニオンに type で名前を付けて export し、その型を使って関数を書く。
// 文字列から型の値に変える関数（parse…）は、どれにも当てはまらなければ undefined を返す。

// 問14 型 Unit（"mm"、"cm"、"m"）を定義して export し、toMillimeters(value: number, unit: Unit) を書く。mm に直した値を返す
//     例: toMillimeters(1.5, "m") → 1500
// ここに型 Unit と関数 toMillimeters を書く
