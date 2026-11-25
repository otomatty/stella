// 問題
// 文章の単語を数える関数を、Map を使って書いてください。引数の Map や配列は変えないこと。
//
// 1. wordCount(text)
//    text を空白（1つ以上の空白や改行）で区切り、単語ごとの出現回数を Map<string, number> で返す。
//    英字は小文字にそろえて数える（"The" と "the" は同じ単語）。単語がなければ空の Map
//
// 2. topWords(counts, n)
//    wordCount の結果を受け取り、出現回数の多い順に上位 n 件を [単語, 回数] の配列で返す。
//    回数が同じなら、Map に先に入った単語を先にする
//
// 3. mergeCounts(a, b)
//    2つの Map をまとめた新しい Map を返す。両方にある単語は回数を足す。a、b は変えない。
//    単語の順は、a に入っている単語を a の順に、その後に b にだけある単語を b の順に
//
// 4. groupByLength(words)
//    単語の配列を、文字数ごとにまとめた Map<number, string[]> を返す。キーは最初に出てきた順
//
// 説明すること（答えは、この下に // のコメントで書く）
// - wordCount の結果を、Map ではなくオブジェクト（Record<string, number>）で返すとしたら、
//   どんな単語で困ることがありそうか（ヒント: "constructor" や "__proto__"）

export function wordCount(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const word of text.split(/\s+/)) {
    if (word === "") {
      continue;
    }
    const key = word.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function topWords(counts: ReadonlyMap<string, number>, n: number): [string, number][] {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

export function mergeCounts(
  a: ReadonlyMap<string, number>,
  b: ReadonlyMap<string, number>,
): Map<string, number> {
  const merged = new Map(a);
  for (const [word, count] of b) {
    merged.set(word, (merged.get(word) ?? 0) + count);
  }
  return merged;
}

export function groupByLength(words: readonly string[]): Map<number, string[]> {
  const groups = new Map<number, string[]>();
  for (const word of words) {
    const group = groups.get(word.length);
    if (group === undefined) {
      groups.set(word.length, [word]);
    } else {
      group.push(word);
    }
  }
  return groups;
}
