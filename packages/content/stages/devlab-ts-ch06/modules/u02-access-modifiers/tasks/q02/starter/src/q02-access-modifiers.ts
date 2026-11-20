// 06-q02 アクセス修飾子と readonly
//
// 教材: https://typescriptbook.jp/reference/object-oriented/class/access-modifiers
//       https://typescriptbook.jp/reference/object-oriented/class/readonly-modifier-in-classes
//       https://typescriptbook.jp/reference/object-oriented/class/constructor-shorthand
//
// 問題
// 銀行口座を表すクラス BankAccount を書いてください。
// 外から直接さわらせたくないものは private に、後から変えないものは readonly にする。
//
// - id: 口座番号（文字列）。外から読めるが、書き換えられない（readonly）
// - 残高と、入出金の履歴は private にする（外から読んだり書き換えたりできない）
// - constructor(id, initial = 0): initial が負なら Error を投げる
// - deposit(amount): 入金して、入金後の残高を返す。amount が 0 以下なら Error を投げる。
//   履歴に "入金 1000" の形で足す
// - withdraw(amount): 出金して、出金後の残高を返す。amount が 0 以下なら Error、
//   残高より多ければ "残高が足りません" の Error を投げる。履歴に "出金 300" の形で足す
// - getBalance(): 残高を返す
// - getHistory(): 履歴の配列を返す。中の配列そのものではなく、コピーを返す

export class BankAccount {}
