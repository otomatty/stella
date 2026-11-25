// 問4 下の2つの関数 add と sub を、最後の export { … } の1行でまとめて export する（function の前に export は付けない）
//     例: add(1, 2) → 3、sub(5, 3) → 2

function add(a: number, b: number): number {
  return a + b;
}

function sub(a: number, b: number): number {
  return a - b;
}

export { add, sub };
