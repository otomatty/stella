// 問題
// ToDo を管理するクラス TodoList を書いてください。型 Todo と Filter は定義済みです。
// ToDo の配列は private にし、外からは下のメソッドでしか変えられないようにする。
//
// - add(title): ToDo を足して、足した ToDo を返す。id は 1, 2, 3… と順に振る。done は false。
//   前後の空白を取り除いた title が空なら "タイトルを入力してください" の Error を投げる
// - complete(id): その ToDo を完了（done を true）にする。何も返さない。
//   見つからなければ "ToDo がありません: <id>" の Error を投げる
// - remove(id): その ToDo を消す。何も返さない。見つからなければ complete と同じ Error を投げる
// - list(filter = "all"): ToDo の配列を返す。"active" は未完了だけ、"done" は完了だけ。
//   返すのはコピー（配列も、中の ToDo も）にして、受け取った側が書き換えても中身が変わらないようにする
// - count(): { all, active, done } の件数を返す
//
// このファイルに書くクラス（export は不要）
// Counter には今の値を表す数値のフィールド count を持たせる。
// - コンストラクタ: 始めの値 start を受け取る。省略したら 0。
// - increment(): 1 増やして、増やした後の値を返す。
// - decrement(): 1 減らして、減らした後の値を返す。ただし 0 より小さくはしない。
// - reset(): 始めの値に戻す。何も返さない（始めの値を覚えておくフィールドが要る）。
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付ける。
// TodoList は Counter を private なフィールドに持ち、increment() の戻り値を id にする。
// q01 で書いた Counter をこのファイルでもう一度書いてください。

class Counter {
  count: number;
  private readonly start: number;

  constructor(start = 0) {
    this.start = start;
    this.count = start;
  }

  increment(): number {
    this.count++;
    return this.count;
  }

  decrement(): number {
    this.count = Math.max(this.count - 1, 0);
    return this.count;
  }

  reset(): void {
    this.count = this.start;
  }
}

export type Todo = { readonly id: number; title: string; done: boolean };
export type Filter = "all" | "active" | "done";

export class TodoList {
  private todos: Todo[] = [];
  private readonly ids = new Counter();

  add(title: string): Todo {
    const trimmed = title.trim();
    if (trimmed === "") {
      throw new Error("タイトルを入力してください");
    }
    const todo: Todo = { id: this.ids.increment(), title: trimmed, done: false };
    this.todos.push(todo);
    return { ...todo };
  }

  complete(id: number): void {
    this.find(id).done = true;
  }

  remove(id: number): void {
    const todo = this.find(id);
    this.todos = this.todos.filter((t) => t !== todo);
  }

  list(filter: Filter = "all"): Todo[] {
    return this.todos
      .filter((t) => filter === "all" || (filter === "done") === t.done)
      .map((t) => ({ ...t }));
  }

  count(): { all: number; active: number; done: number } {
    const done = this.todos.filter((t) => t.done).length;
    return { all: this.todos.length, active: this.todos.length - done, done };
  }

  private find(id: number): Todo {
    const todo = this.todos.find((t) => t.id === id);
    if (todo === undefined) {
      throw new Error(`ToDo がありません: ${id}`);
    }
    return todo;
  }
}
