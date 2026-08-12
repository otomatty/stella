import { describe, expect, it } from "vitest";
import { parseQuiz } from "./parse-quiz.js";

const SAMPLE = `# レッスン1-1 演習 — 変数

## 演習問題

### 問1(基本)

なにか

## 確認クイズ

### Q1. 再代入が必要な変数を宣言するキーワードはどれですか?

- A. \`const\`
- B. \`let\`
- C. どちらでもよい

<details>
<summary>答え</summary>

**B** — \`let\`は再代入できます。

</details>

### Q2. つぎの設問

- A. あ
- B. い

<details>
<summary>答え</summary>

**A** — あが正しい。

</details>
`;

describe("parseQuiz", () => {
  it("確認クイズ節の設問だけを取り出す", () => {
    const qs = parseQuiz(SAMPLE);
    expect(qs).toHaveLength(2);
    expect(qs[0].prompt).toBe("再代入が必要な変数を宣言するキーワードはどれですか?");
    expect(qs[0].explanation).toBe("`let`は再代入できます。");
    expect(qs[0].options).toEqual([
      { label: "`const`", isCorrect: false },
      { label: "`let`", isCorrect: true },
      { label: "どちらでもよい", isCorrect: false },
    ]);
    expect(qs[1].options[0]).toEqual({ label: "あ", isCorrect: true });
  });

  it("演習問題の見出しを拾わない", () => {
    expect(parseQuiz(SAMPLE).some((q) => q.prompt.includes("なにか"))).toBe(false);
  });

  it("CRLF でも同じ結果になる", () => {
    expect(parseQuiz(SAMPLE.replace(/\n/g, "\r\n"))).toEqual(parseQuiz(SAMPLE));
  });

  it("正解ラベルが選択肢に無ければ投げる", () => {
    const broken = SAMPLE.replace("**B** — `let`は再代入できます。", "**Z** — こわれている");
    expect(() => parseQuiz(broken)).toThrow(/正解ラベル/);
  });
});
