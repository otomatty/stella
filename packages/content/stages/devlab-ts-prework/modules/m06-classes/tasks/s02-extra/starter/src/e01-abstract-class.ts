// 06-e01 発展問題 抽象クラス
//
// 教材: https://typescriptbook.jp/reference/object-oriented/class/abstract-class
//
// 問題
// 抽象クラス（abstract class）は、それ自体からは new できず、継承して使うためのクラスです。
// 中身を子クラスに任せたいメソッドには abstract を付け、本体を書かずに宣言だけします。
//
// 1. 抽象クラス Report を書いてください
//    - abstract title(): string … 子クラスで書く
//    - abstract body(): string[] … 子クラスで書く
//    - render(): string … "# タイトル" の行と、本文の各行を "- 本文" にした行を、改行（\n）でつないで返す
//
// 2. Report を継承した SalesReport(sales: readonly number[]) を書いてください
//    - title() は "売上レポート"
//    - body() は ["件数 3", "合計 600"] の形
//
// 3. Report を継承した TodoReport(todos: readonly string[]) を書いてください
//    - title() は "ToDo"
//    - body() は todos をそのまま並べる。空なら ["なし"]
//
// 説明すること（答えは、この下に // のコメントで書く）
// - インターフェースではなく抽象クラスを使うとよいのは、どんなときか

export class Report {}

export class SalesReport {}

export class TodoReport {}
