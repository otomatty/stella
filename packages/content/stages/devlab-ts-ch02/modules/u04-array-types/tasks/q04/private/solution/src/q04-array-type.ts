// 問題
// 次の4つの関数を書いてください。
// 引数の配列は、関数の中で書き換えないことを示すために readonly number[] にすること。
//
// 1. sum(numbers)       合計を返す。空の配列なら 0
// 2. max(numbers)       最大値を返す。空の配列なら Error を投げる
// 3. doubleAll(numbers) すべての要素を2倍にした新しい配列を返す
// 4. positives(numbers) 0より大きい要素だけを集めた新しい配列を返す
//
// ヒント: for-of、map、filter が使える。Math.max(...numbers) という書き方もある

export function sum(numbers: readonly number[]): number {
  let total = 0;
  for (const n of numbers) {
    total += n;
  }
  return total;
}

export function max(numbers: readonly number[]): number {
  if (numbers.length === 0) {
    throw new Error("空の配列には最大値がありません");
  }
  return Math.max(...numbers);
}

export function doubleAll(numbers: readonly number[]): number[] {
  return numbers.map((n) => n * 2);
}

export function positives(numbers: readonly number[]): number[] {
  return numbers.filter((n) => n > 0);
}
