// 09-q02 Set
//
// 教材: https://typescriptbook.jp/reference/builtin-api/set
//
// 問題
// 配列を集合として扱う関数を、Set を使って書いてください。引数の配列は変えないこと。
// 型変数（07章）を使い、どんな要素の配列にも使えるようにする。戻り値はすべて配列（T[]）にする。
// Set の union や intersection などのメソッドは、このテンプレートの設定（ES2022）では使えないので、自分で書く。
//
// 1. unique(items): 重複を除いた配列。順は最初に出てきた順
// 2. intersection(a, b): a と b の両方にある要素の配列。a の順、重複なし
// 3. difference(a, b): a にあって b にない要素の配列。a の順、重複なし
// 4. union(a, b): a か b のどちらかにある要素の配列。a の要素を a の順に、その後に b にだけある要素を b の順に。重複なし
// 5. isSubset(a, b): a の要素がすべて b にあれば true（a が空なら true）
//
// どの関数も、配列の includes をくり返し呼ぶのではなく、Set の has を使うこと
//
// 説明すること（答えは、この下に // のコメントで書く）
// - 要素が1万個の配列どうしの intersection を、配列の includes で書いた場合と Set の has で書いた場合で、
//   比べる回数はおよそ何回になるか

export function unique() {}

export function intersection() {}

export function difference() {}

export function union() {}

export function isSubset() {}
