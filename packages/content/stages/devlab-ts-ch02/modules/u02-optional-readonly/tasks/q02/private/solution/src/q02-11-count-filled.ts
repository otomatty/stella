// 問11 { a?, b?, c? } のうち、値があるプロパティの数を返す
//     例: countFilled({ a: "x", c: "z" }) → 2
// 引数と戻り値には型注釈を付けます。
// 値が省略されたかどうかは undefined と比較して確かめます。
export function countFilled(form: { a?: string; b?: string; c?: string }): number {
  let count = 0;
  if (form.a !== undefined) {
    count++;
  }
  if (form.b !== undefined) {
    count++;
  }
  if (form.c !== undefined) {
    count++;
  }
  return count;
}
