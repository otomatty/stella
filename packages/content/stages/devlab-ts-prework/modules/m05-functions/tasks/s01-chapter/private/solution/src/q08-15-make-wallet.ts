// 05-q08 関数を返す関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-is-a-value
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問15
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
