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
