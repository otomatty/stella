// 問15 { deposit, withdraw, balance } を返す。deposit(n) と withdraw(n) は残高を変えて、変えた後の残高を返す。残高より多く引き出そうとしたら "残高が足りません" の Error を投げる
//     例: const w = makeWallet(1000); w.withdraw(300) → 700
// 引数には型注釈を付け、戻り値の型注釈には各プロパティの関数の型を書いてください。
// 外側の関数に状態を持たせ、返す関数から読み書きしてください。

export function makeWallet(initial: number): {
  deposit: (n: number) => number;
  withdraw: (n: number) => number;
  balance: () => number;
} {
  let money = initial;
  return {
    deposit: (n) => {
      money += n;
      return money;
    },
    withdraw: (n) => {
      if (n > money) {
        throw new Error("残高が足りません");
      }
      money -= n;
      return money;
    },
    balance: () => money,
  };
}
