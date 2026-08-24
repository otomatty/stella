/**
 * 擬似言語トランスパイラの回帰テスト (#133)。
 *
 * 「JS に落とせること」ではなく「擬似言語として正しく動くこと」を見る。
 * とくに 1 起点の配列と整数除算は、 TypeScript 翻訳版では学べない部分であり
 * この講座の主目的なので、 意味論を直接アサートする。
 */

import { describe, expect, it, vi } from "vitest";

import { FePseudoError } from "./errors.js";
import { transpileFePseudo } from "./index.js";
import { tokenize } from "./lexer.js";

/** 擬似言語をトランスパイルし、 続けて `tail` を評価した結果を返す。 */
function run(source: string, tail: string): unknown {
  const code = transpileFePseudo(source);
  return new Function(`${code}\n${tail}`)();
}

/** 単一関数の課題を組み立てて呼び出す。 */
function callFunction(source: string, call: string): unknown {
  return run(source, `return ${call};`);
}

describe("字句解析", () => {
  it("全角の記号と括弧を半角に正規化する", () => {
    const values = tokenize("ｘ　←　１＋２").map((t) => t.value);
    expect(values).toEqual(["x", "←", "1", "+", "2", "\n", ""]);
  });

  it("`<-` `<=` `!=` などの ASCII 代替記法を正規形に寄せる", () => {
    const values = tokenize("a <- b <= c != d >= e").map((t) => t.value);
    expect(values).toEqual(["a", "←", "b", "≦", "c", "≠", "d", "≧", "e", "\n", ""]);
  });

  it("日本語の連なりを助詞で切り出す", () => {
    const values = tokenize("iを1からnまで1ずつ増やす").map((t) => t.value);
    expect(values).toEqual(["i", "を", "1", "から", "n", "まで", "1", "ずつ増やす", "\n", ""]);
  });

  it("日本語の識別子の直後の `の要素数` も切り出す", () => {
    const values = tokenize("配列の要素数").map((t) => t.value);
    expect(values).toEqual(["配列", "の要素数", "\n", ""]);
  });

  it("コメントを読み飛ばす", () => {
    const values = tokenize("a ← 1 // 説明\n/* 複数行\nコメント */\nb ← 2").map((t) => t.value);
    expect(values.filter((v) => v !== "\n" && v !== "")).toEqual(["a", "←", "1", "b", "←", "2"]);
  });

  it("行頭トークンにインデント幅を持たせる", () => {
    const tokens = tokenize("a ← 1\n    b ← 2");
    expect(tokens[0].indent).toBe(0);
    expect(tokens.find((t) => t.value === "b")?.indent).toBe(4);
  });
});

describe("配列は 1 から始まる", () => {
  const 先頭 = `
○整数型: 先頭(整数型の配列: a)
  return a[1]
`;

  it("添字 1 が先頭の要素を指す", () => {
    expect(callFunction(先頭, "先頭([10, 20, 30])")).toBe(10);
  });

  it("添字 0 は範囲外エラーになる (黙って undefined を返さない)", () => {
    const source = `
○整数型: f(整数型の配列: a)
  return a[0]
`;
    expect(() => callFunction(source, "f([1, 2, 3])")).toThrow(/範囲外/);
  });

  it("要素数 + 1 も範囲外エラーになる", () => {
    const source = `
○整数型: f(整数型の配列: a)
  return a[aの要素数 + 1]
`;
    expect(() => callFunction(source, "f([1, 2, 3])")).toThrow(/範囲外/);
  });

  it("代入も 1 起点で行われる", () => {
    const source = `
○入替(整数型の配列: a)
  整数型: tmp
  tmp ← a[1]
  a[1] ← a[2]
  a[2] ← tmp
`;
    expect(run(source, "const a = [1, 2, 3]; 入替(a); return a;")).toEqual([2, 1, 3]);
  });

  it("`の要素数` が配列の長さを返す", () => {
    const source = `
○整数型: 個数(整数型の配列: a)
  return aの要素数
`;
    expect(callFunction(source, "個数([1, 2, 3, 4])")).toBe(4);
  });
});

describe("整数の除算は商 (切り捨て)", () => {
  it("整数同士は切り捨てる", () => {
    expect(run("整数型: x ← 10 ÷ 3", "return x;")).toBe(3);
  });

  it("負の商は 0 方向に切り捨てる", () => {
    expect(run("整数型: x ← -7 ÷ 2", "return x;")).toBe(-3);
  });

  it("実数型と宣言された変数は切り捨てない", () => {
    expect(run("実数型: x ← 10.0\n実数型: y ← x ÷ 4", "return y;")).toBe(2.5);
  });

  it("実数を返す関数の除算も切り捨てない", () => {
    const source = `
○実数型: 平均(実数型の配列: a)
  実数型: s ← 0.0
  整数型: i
  for (i を 1 から aの要素数 まで 1 ずつ増やす)
    s ← s + a[i]
  endfor
  return s ÷ aの要素数
`;
    expect(callFunction(source, "平均([1, 2, 3, 4])")).toBe(2.5);
  });

  it("整数型どうしの平均は商になる (擬似言語の仕様どおり)", () => {
    const source = `
○整数型: 平均(整数型の配列: a)
  整数型: s ← 0
  整数型: i
  for (i を 1 から aの要素数 まで 1 ずつ増やす)
    s ← s + a[i]
  endfor
  return s ÷ aの要素数
`;
    expect(callFunction(source, "平均([1, 2, 3, 4])")).toBe(2);
  });

  it("0 除算は日本語のエラーになる", () => {
    expect(() => run("整数型: x ← 1 ÷ 0", "return x;")).toThrow(/0 で除算/);
  });

  it("`mod` と `%` はどちらも剰余", () => {
    expect(run("整数型: x ← 7 mod 3", "return x;")).toBe(1);
    expect(run("整数型: x ← 7 % 3", "return x;")).toBe(1);
  });
});

describe("制御構造", () => {
  it("if / elseif / else", () => {
    const source = `
○文字列型: 判定(整数型: n)
  if (n > 0)
    return "正"
  elseif (n < 0)
    return "負"
  else
    return "ゼロ"
  endif
`;
    expect(callFunction(source, "判定(5)")).toBe("正");
    expect(callFunction(source, "判定(-5)")).toBe("負");
    expect(callFunction(source, "判定(0)")).toBe("ゼロ");
  });

  it("while", () => {
    const source = `
○整数型: 合計(整数型: n)
  整数型: i ← 1
  整数型: s ← 0
  while (i ≦ n)
    s ← s + i
    i ← i + 1
  endwhile
  return s
`;
    expect(callFunction(source, "合計(5)")).toBe(15);
  });

  it("do 〜 while は必ず 1 回は実行される", () => {
    const source = `
○整数型: 回数(整数型: n)
  整数型: c ← 0
  do
    c ← c + 1
  while (c < n)
  return c
`;
    expect(callFunction(source, "回数(0)")).toBe(1);
    expect(callFunction(source, "回数(3)")).toBe(3);
  });

  it("do の本体に while ループを入れ子にできる", () => {
    const source = `
○整数型: f()
  整数型: i ← 0
  整数型: k
  do
    k ← 0
    while (k < 2)
      k ← k + 1
    endwhile
    i ← i + k
  while (i < 5)
  return i
`;
    expect(callFunction(source, "f()")).toBe(6);
  });

  it("for で増やす / 減らす", () => {
    const up = `
○整数型: f(整数型: n)
  整数型: s ← 0
  整数型: i
  for (i を 1 から n まで 1 ずつ増やす)
    s ← s + i
  endfor
  return s
`;
    const down = `
○整数型: f(整数型: n)
  整数型: s ← 0
  整数型: i
  for (i を n から 1 まで 1 ずつ減らす)
    s ← s + i
  endfor
  return s
`;
    expect(callFunction(up, "f(4)")).toBe(10);
    expect(callFunction(down, "f(4)")).toBe(10);
  });

  it("for ループ後も制御変数が最終値を保持する", () => {
    const source = `
○整数型: f(整数型: n)
  整数型: i
  整数型: s ← 0
  for (i を 1 から n まで 1 ずつ増やす)
    s ← s + i
  endfor
  return i
`;
    expect(callFunction(source, "f(5)")).toBe(6);
  });

  it("`ずつ 増やす` と分かち書きしても読める", () => {
    const source = `
○整数型: f(整数型: n)
  整数型: s ← 0
  整数型: i
  for ( i を 1 から n まで 2 ずつ 増やす )
    s ← s + i
  endfor
  return s
`;
    expect(callFunction(source, "f(5)")).toBe(9);
  });

  it("再帰呼び出しができる", () => {
    const source = `
○整数型: 階乗(整数型: n)
  if (n ≦ 1)
    return 1
  endif
  return n × 階乗(n - 1)
`;
    expect(callFunction(source, "階乗(5)")).toBe(120);
  });

  it("宣言はブロックではなく手続き全体に効く", () => {
    const source = `
○整数型: f(整数型: n)
  if (n > 0)
    整数型: x ← 1
  endif
  x ← 2
  return x
`;
    expect(callFunction(source, "f(1)")).toBe(2);
  });
});

describe("式と組み込み", () => {
  it("論理演算子と比較演算子", () => {
    const source = `
○論理型: f(整数型: n)
  return n ≧ 3 and not (n = 5) or n ≠ n
`;
    expect(callFunction(source, "f(4)")).toBe(true);
    expect(callFunction(source, "f(5)")).toBe(false);
    expect(callFunction(source, "f(2)")).toBe(false);
  });

  it("`not` は比較より強く結合する (IPA 公式)", () => {
    const source = `
○論理型: f(整数型: a, 整数型: b)
  return not a = b
`;
    expect(callFunction(source, "f(1, 2)")).toBe(false);
    expect(callFunction(source, "f(2, 2)")).toBe(false);
  });

  it("配列リテラルを書ける", () => {
    expect(run("整数型の配列: a ← {2, 4, 6}", "return a;")).toEqual([2, 4, 6]);
  });

  it("2 次元配列の添字も 1 起点になる", () => {
    const source = `
○整数型: f()
  整数型の配列: m ← {{1, 2}, {3, 4}}
  return m[2][1]
`;
    expect(callFunction(source, "f()")).toBe(3);
  });

  it("公式記法 `配列[i, j]` で 2 次元添字を書ける", () => {
    const source = `
○整数型: f()
  整数型の配列: m ← {{1, 2}, {3, 4}}
  return m[2, 1]
`;
    expect(callFunction(source, "f()")).toBe(3);
  });

  it("2 次元実数配列の除算は切り捨てない", () => {
    const source = `
○実数型: f()
  実数型の配列: row ← {1.0, 2.0}
  実数型の配列の配列: m ← {row, row}
  return m[1][2] ÷ m[1][1]
`;
    expect(callFunction(source, "f()")).toBe(2);
  });

  it("Array などの変数名がランタイム組み込みを壊さない", () => {
    const source = `
○整数型: f(整数型の配列: a)
  整数型: Array ← 1
  return a[1]
`;
    expect(callFunction(source, "f([10, 20])")).toBe(10);
  });

  it("`出力` で標準出力に書ける", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      run('出力("x =", 1 + 2)', "return null;");
      expect(spy).toHaveBeenCalledWith("x =", 3);
    } finally {
      spy.mockRestore();
    }
  });

  it("文字列のエスケープを解釈する", () => {
    expect(run('文字列型: s ← "a\\nb"', "return s;")).toBe("a\nb");
  });
});

describe("バブルソート (科目B の代表問題)", () => {
  it("昇順に並べ替える", () => {
    const source = `
○バブルソート(整数型の配列: data)
  整数型: i, j, tmp
  for (i を 1 から dataの要素数 - 1 まで 1 ずつ増やす)
    for (j を 1 から dataの要素数 - i まで 1 ずつ増やす)
      if (data[j] > data[j + 1])
        tmp ← data[j]
        data[j] ← data[j + 1]
        data[j + 1] ← tmp
      endif
    endfor
  endfor
`;
    expect(run(source, "const a = [5, 3, 8, 1, 9, 2]; バブルソート(a); return a;")).toEqual([
      1, 2, 3, 5, 8, 9,
    ]);
  });
});

describe("構文エラー", () => {
  function expectError(source: string, pattern: RegExp, line?: number): void {
    try {
      transpileFePseudo(source);
    } catch (error) {
      expect(error).toBeInstanceOf(FePseudoError);
      expect((error as FePseudoError).message).toMatch(pattern);
      if (line !== undefined) {
        expect((error as FePseudoError).line).toBe(line);
      }
      return;
    }
    throw new Error("エラーになるはずのコードが通ってしまった");
  }

  it("endif の閉じ忘れ", () => {
    expectError("if (x > 1)\n  x ← 2\n", /`endif` がありません/);
  });

  it("endwhile の閉じ忘れ", () => {
    expectError("while (x > 1)\n  x ← 2\n", /`endwhile` がありません/);
  });

  it("do に対応する while が無い", () => {
    expectError("do\n  x ← 2\n", /`while` がありません/);
  });

  it("対応する開始行が無い endif", () => {
    expectError("endif\n", /対応する開始行が無い/);
  });

  it("for の書式ちがい", () => {
    expectError("for (i = 1 to 10)\n  x ← 1\nendfor\n", /ずつ増やす|`を` が見つかりません/);
  });

  it("予約語は識別子に使えない", () => {
    expectError("整数型: class ← 1", /予約語/);
  });

  it("ランナー予約の接頭辞は識別子に使えない", () => {
    expectError("整数型: __feX ← 1", /__fe/);
  });

  it("eval / Function / __fe* の呼び出しは禁止", () => {
    expectError("整数型: x ← eval(1)", /eval.*呼び出せません/);
    expectError("整数型: x ← Function(1)", /Function.*呼び出せません/);
    expectError("整数型: x ← __feIdx(a, 1)", /__fe.*内部用/);
  });

  it("閉じられていない文字列", () => {
    expectError('文字列型: s ← "abc', /文字列が閉じられていません/);
  });

  it("閉じられていないブロックコメント", () => {
    expectError("/* コメント\n整数型: x ← 1", /`\*\/` で閉じられていません/);
  });

  it("擬似言語で使えない文字", () => {
    expectError("整数型: x ← 1 @ 2", /使えない文字/);
  });

  it("エラーは行番号を持つ", () => {
    expectError("整数型: x ← 1\n整数型: y ← 2\nendif\n", /対応する開始行が無い/, 3);
  });

  it("本体をインデントしていない関数", () => {
    expectError("○整数型: f(整数型: n)\nreturn n\n", /深くインデント/);
  });

  it("本体が空の関数は骨組みとして通す (未編集のスターターを構文エラーにしない)", () => {
    expect(() =>
      transpileFePseudo("○f(整数型の配列: a)\n  /* ここに処理を書く */\n"),
    ).not.toThrow();
  });

  it("1 行に 2 文は書けない", () => {
    expectError("整数型: x ← 1 整数型: y ← 2", /1 行に 1 文/);
  });
});
