// 01-q01 letとconst ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/let-and-const
//       https://typescriptbook.jp/reference/values-types-variables/vars-problems

// 問12
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
