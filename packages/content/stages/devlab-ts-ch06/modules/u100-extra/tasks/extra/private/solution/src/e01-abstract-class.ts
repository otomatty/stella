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

// 子クラスに共通の処理（render）を親に書いておき、違うところ（title と body）だけを子に任せたいときは抽象クラス。
// 形だけを決めて、処理を共有しないならインターフェースで足りる
export abstract class Report {
  abstract title(): string;
  abstract body(): string[];

  render(): string {
    return [`# ${this.title()}`, ...this.body().map((line) => `- ${line}`)].join("\n");
  }
}

export class SalesReport extends Report {
  constructor(private readonly sales: readonly number[]) {
    super();
  }

  title(): string {
    return "売上レポート";
  }

  body(): string[] {
    let total = 0;
    for (const sale of this.sales) {
      total += sale;
    }
    return [`件数 ${this.sales.length}`, `合計 ${total}`];
  }
}

export class TodoReport extends Report {
  constructor(private readonly todos: readonly string[]) {
    super();
  }

  title(): string {
    return "ToDo";
  }

  body(): string[] {
    return this.todos.length === 0 ? ["なし"] : [...this.todos];
  }
}
