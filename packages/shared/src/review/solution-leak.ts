/**
 * 受講者への返信に解答例のコードが混ざっていないかの機械の照合 (07 §6.6)。
 *
 * AI への指示で禁じるだけでは守れないので、返信を解答例と突き合わせる。単位は字句の並び
 * (n-gram)。受講者自身の提出と配布物 (課題文・starter・テスト) にもある並びは、返信が
 * 受講者のコードを引用しても漏洩にしないために除く。残った「解答例にしかない並び」が
 * 返信に 1 つでもあれば当たりとする。
 *
 * 確認A・Bは並びを短くして厳しく見る (短い断片でも当てる)。当たったときの扱いは
 * 呼び出し側が決める (練習は返信を差し替え、確認A・Bは人に回す)。
 */

/** 照合の方式を変えたら上げる。レビュー結果に記録する。 */
export const SOLUTION_LEAK_CHECK_VERSION = "ngram-1";

/** 練習の n-gram の長さ (字句数)。1 行ぶんのコードがそのまま返信に入ったら当てる。 */
const PRACTICE_N = 10;
/** 確認A・B (と統合) の n-gram の長さ。式の一部程度の断片でも当てる。 */
const STRICT_N = 6;

const TOKEN = /[\p{L}\p{N}_$]+|[^\s\p{L}\p{N}_$]/gu;
const WORD = /^[\p{L}\p{N}_$]/u;

function tokenize(source: string): string[] {
  return source.match(TOKEN) ?? [];
}

/**
 * 語 (識別子・数・文字列の中身) を n の 3 分の 1 (最低 2) 以上含む並びだけを数える。
 * 記号だけの並びは偶然でも重なる。
 */
function grams(source: string, n: number): Set<string> {
  const tokens = tokenize(source);
  const out = new Set<string>();
  const minWords = Math.max(2, Math.floor(n / 3));
  for (let i = 0; i + n <= tokens.length; i++) {
    const slice = tokens.slice(i, i + n);
    if (slice.filter((t) => WORD.test(t)).length < minWords) continue;
    out.add(slice.join("\u0001"));
  }
  return out;
}

export interface SolutionLeakInput {
  /** 受講者に見せうる文 (返信・良かった点・次に試すこと・所見のコメント)。 */
  texts: string[];
  /** 解答例のファイルの本文。 */
  solution: string[];
  /** 受講者がすでに持っている本文 (提出ファイル・配布物・課題文)。 */
  known: string[];
  /** 確認A・Bなど、厳しく見る課題なら true。 */
  strict: boolean;
}
export interface SolutionLeakResult {
  version: string;
  n: number;
  /** 当たった文の位置 (`texts` の添字)。 */
  hits: number[];
  /** 当たった並びの例 (講師の確認用。最大 3 件)。 */
  fragments: string[];
}

export function checkSolutionLeak(input: SolutionLeakInput): SolutionLeakResult {
  const n = input.strict ? STRICT_N : PRACTICE_N;
  const secret = new Set<string>();
  for (const s of input.solution) for (const g of grams(s, n)) secret.add(g);
  for (const k of input.known) for (const g of grams(k, n)) secret.delete(g);
  const hits: number[] = [];
  const fragments: string[] = [];
  input.texts.forEach((textValue, index) => {
    let hit = false;
    for (const g of grams(textValue, n)) {
      if (!secret.has(g)) continue;
      hit = true;
      if (fragments.length < 3) fragments.push(g.split("\u0001").join(" "));
    }
    if (hit) hits.push(index);
  });
  return { version: SOLUTION_LEAK_CHECK_VERSION, n, hits, fragments };
}
