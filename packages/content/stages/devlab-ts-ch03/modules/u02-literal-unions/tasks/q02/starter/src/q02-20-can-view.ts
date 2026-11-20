// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union
//
// 引数と戻り値には型注釈を付けること。
// "表" | "裏" のようなリテラル型のユニオンに type で名前を付けて export し、その型を使って関数を書く。
// 文字列から型の値に変える関数（parse…）は、どれにも当てはまらなければ undefined を返す。

// 問20 型 Visibility（"public" か "private"）を定義して export し、canView(visibility: Visibility, isOwner: boolean) を書く。public なら誰でも、private なら持ち主だけ true
//     例: canView("private", false) → false
// ここに型 Visibility と関数 canView を書く
