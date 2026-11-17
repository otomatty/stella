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
