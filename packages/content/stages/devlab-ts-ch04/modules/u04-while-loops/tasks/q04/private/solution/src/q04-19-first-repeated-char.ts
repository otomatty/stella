// 問19 2回目に出てきた最初の文字を返す（見つかったら break）。なければ undefined
//     例: firstRepeatedChar("abcbd") → "b"
// 引数と戻り値に型注釈を付けます。
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
