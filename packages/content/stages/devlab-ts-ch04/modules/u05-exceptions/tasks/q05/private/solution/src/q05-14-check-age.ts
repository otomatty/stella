// 問14 0〜150 でなければ RangeError（throw new RangeError("…")）を投げる。問題なければ何も返さない
//     例: checkAge(200) → RangeError
// 引数と戻り値に型注釈を付けます。
export function checkAge(age: number): void {
  if (age < 0 || age > 150) {
    throw new RangeError("年齢は0〜150にしてください");
  }
}
