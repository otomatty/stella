// 問5 下の関数 internalSquare を、square という名前で export する（export { 元の名前 as 新しい名前 }）
//     例: square(3) → 9
function internalSquare(n: number): number {
  return n * n;
}

// ここに export { … as square } を書く
