// 04-q04 while文と break・continue ドリル
//
// 教材: https://jsprimer.net/basic/loop/

// 問19
export function firstRepeatedChar(text: string): string | undefined {
  let seen = "";
  let found: string | undefined;
  for (const c of text) {
    if (seen.includes(c)) {
      found = c;
      break;
    }
    seen += c;
  }
  return found;
}
