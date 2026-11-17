// 06-q05 ★総合問題 ToDoリスト
//
// 教材: 06章のこれまでの教材
//
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
// 前の問題を使う
// 使う問題: q01（Counter）
// id は、q01 の Counter で振る。Counter を private なフィールドに持ち、increment() の戻り値を id にする。
// Counter は、このファイルの先頭で import してある。q01 が解けていないと、この問題のテストも通らない

import { Counter } from "./q01-class-basics";

export type Todo = { readonly id: number; title: string; done: boolean };
export type Filter = "all" | "active" | "done";

export class TodoList {}
