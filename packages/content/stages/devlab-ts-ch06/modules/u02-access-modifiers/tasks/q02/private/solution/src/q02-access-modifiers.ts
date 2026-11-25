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

export class BankAccount {
  private balance: number;
  private readonly history: string[] = [];

  constructor(
    readonly id: string,
    initial = 0,
  ) {
    if (initial < 0) {
      throw new Error("最初の残高は0以上にしてください");
    }
    this.balance = initial;
  }

  deposit(amount: number): number {
    if (amount <= 0) {
      throw new Error("入金額は0より大きくしてください");
    }
    this.balance += amount;
    this.history.push(`入金 ${amount}`);
    return this.balance;
  }

  withdraw(amount: number): number {
    if (amount <= 0) {
      throw new Error("出金額は0より大きくしてください");
    }
    if (amount > this.balance) {
      throw new Error("残高が足りません");
    }
    this.balance -= amount;
    this.history.push(`出金 ${amount}`);
    return this.balance;
  }

  getBalance(): number {
    return this.balance;
  }

  getHistory(): string[] {
    return [...this.history];
  }
}
