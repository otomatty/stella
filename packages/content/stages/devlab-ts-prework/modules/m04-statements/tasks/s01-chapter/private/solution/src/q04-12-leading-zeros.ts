// 04-q04 while文と break・continue ドリル
//
// 教材: https://jsprimer.net/basic/loop/

// 問12
export function leadingZeros(text: string): number {
  let count = 0;
  while (text[count] === "0") {
    count++;
  }
  return count;
}
