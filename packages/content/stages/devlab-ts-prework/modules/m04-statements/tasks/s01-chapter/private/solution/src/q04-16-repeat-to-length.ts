// 04-q04 while文と break・continue ドリル
//
// 教材: https://jsprimer.net/basic/loop/

// 問16
export function repeatToLength(text: string, length: number): string {
  if (text === "") {
    return "";
  }
  let result = "";
  while (result.length < length) {
    result += text;
  }
  return result.slice(0, length);
}
