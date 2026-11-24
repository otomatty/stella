// 問12 3の倍数なら "Fizz"、5の倍数なら "Buzz"、両方なら "FizzBuzz"、どちらでもなければ数字の文字列を返す
//     例: fizzBuzz(15) → "FizzBuzz"
export function fizzBuzz(n: number): string {
  let label = "";
  if (n % 3 === 0) {
    label += "Fizz";
  }
  if (n % 5 === 0) {
    label += "Buzz";
  }
  return label === "" ? String(n) : label;
}
