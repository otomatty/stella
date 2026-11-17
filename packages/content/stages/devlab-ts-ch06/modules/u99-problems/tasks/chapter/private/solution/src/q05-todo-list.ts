import { Counter } from "./q01-class-basics";

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
