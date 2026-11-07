// 04-q04 while文と break・continue ドリル
//
// 教材: https://jsprimer.net/basic/loop/

// 問13
export function trimZeros(text: string): string {
  let start = 0;
  while (start < text.length - 1 && text[start] === "0") {
    start++;
  }
  return text.slice(start);
}
