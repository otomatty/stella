import { describe, expect, it } from "vitest";

import { parseQuiz } from "./parse-quiz.js";
import {
  dropDetails,
  extractDetails,
  quizAnswersMarkdown,
  splitPracticeForPdf,
  splitSections,
  unwrapDetails,
} from "./practice-pdf.js";

const PRACTICE = `# レッスン1-1 演習 — 変数

対象トピック: 1-1-1 〜 1-1-4

## ハンズオン

写経してください。

\`\`\`ts
const a = 1;
\`\`\`

## 演習問題

### 問1(基本)

宣言してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

\`\`\`ts
const b = 2;
\`\`\`

解説です。

</details>

## 確認クイズ

### Q1. 再代入が必要な変数を宣言するキーワードはどれですか?

- A. \`const\`
- B. \`let\`
- C. どちらでもよい

<details>
<summary>答え</summary>

**B** — \`let\`は再代入できます。

</details>
`;

describe("splitSections", () => {
  it("## 見出しで割り、コードフェンス内の ## は見出しにしない", () => {
    const fenced = "前文\n\n## A\n\n```md\n## フェンス内\n```\n\n## B\n\n本文\n";
    const sections = splitSections(fenced);
    expect(sections.map((s) => s.heading)).toEqual([null, "A", "B"]);
    expect(sections[1].body).toContain("## フェンス内");
  });
});

describe("dropDetails / unwrapDetails", () => {
  it("dropDetails は答えブロックをまるごと消す", () => {
    const out = dropDetails(PRACTICE);
    expect(out).not.toContain("<details>");
    expect(out).not.toContain("は再代入できます");
    expect(out).toContain("- B. `let`");
  });

  it("unwrapDetails は summary を見出しに展開する", () => {
    const out = unwrapDetails("<details>\n<summary>問1の解答例</summary>\n\n本文\n\n</details>\n");
    expect(out).toContain("#### 問1の解答例");
    expect(out).not.toContain("<details>");
    expect(out).not.toContain("</details>");
    expect(out).toContain("本文");
  });

  it("コードフェンス内の <details> は触らない", () => {
    const src = "```html\n<details>\n<summary>UI部品の例</summary>\n</details>\n```\n";
    expect(dropDetails(src)).toBe(src);
    expect(unwrapDetails(src)).toBe(src);
  });
});

describe("splitPracticeForPdf", () => {
  const questions = parseQuiz(PRACTICE);
  const { problems, answers } = splitPracticeForPdf(PRACTICE, questions);

  it("問題編は冒頭 + ハンズオン + 演習問題 + クイズ設問で、答えを含まない", () => {
    expect(problems).toContain("# レッスン1-1 演習 — 変数");
    expect(problems).toContain("## ハンズオン");
    expect(problems).toContain("## 演習問題");
    expect(problems).toContain("## 確認クイズ");
    expect(problems).toContain("- B. `let`");
    expect(problems).not.toContain("解答例");
    expect(problems).not.toContain("再代入できます");
    expect(problems).not.toContain("<details>");
  });

  it("解答編は解答例と解説 + クイズの正解で、設問の重複列挙はしない", () => {
    expect(answers).toContain("## 解答例と解説");
    expect(answers).toContain("#### 問1の解答例");
    expect(answers).toContain("## 確認クイズの解答");
    expect(answers).toContain("**正解: B.** `let`");
    expect(answers).toContain("再代入できます");
    expect(answers).not.toContain("## ハンズオン");
  });

  it("解答節が無くてもクイズの解答だけで解答編を作る", () => {
    const src = PRACTICE.replace(/## 解答例と解説[\s\S]*?## 確認クイズ/, "## 確認クイズ");
    const parts = splitPracticeForPdf(src, parseQuiz(src));
    expect(parts.answers).toContain("## 確認クイズの解答");
    expect(parts.answers).not.toContain("解答例と解説");
  });
});

describe("extractDetails", () => {
  it("フェンス外の details を展開して抜き出し、フェンス内は無視する", () => {
    const src =
      "説明\n\n<details>\n<summary>分類の例</summary>\n\n1. 可用性\n\n</details>\n\n```html\n<details>\n<summary>例示</summary>\n</details>\n```\n";
    const blocks = extractDetails(src);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain("#### 分類の例");
    expect(blocks[0]).toContain("1. 可用性");
  });
});

describe("splitPracticeForPdf — ハンズオン内の解答 details", () => {
  it("問題編から落とした details を解答編へ回収する", () => {
    const src = PRACTICE.replace(
      "## 演習問題",
      "分類してください。\n\n<details>\n<summary>分類の例</summary>\n\n1. 可用性(DoS攻撃が典型)\n\n</details>\n\n## 演習問題",
    );
    const { problems, answers } = splitPracticeForPdf(src, parseQuiz(src));
    expect(problems).not.toContain("可用性");
    expect(answers).toContain("## 演習内のヒント・解答");
    expect(answers).toContain("#### 分類の例");
    expect(answers).toContain("可用性(DoS攻撃が典型)");
  });
});

describe("quizAnswersMarkdown", () => {
  it("正解ラベルを A.. の並びから復元する", () => {
    const md = quizAnswersMarkdown(parseQuiz(PRACTICE));
    expect(md).toContain("### Q1. 再代入が必要な変数を宣言するキーワードはどれですか?");
    expect(md).toContain("**正解: B.** `let`");
  });

  it("設問が無ければ空", () => {
    expect(quizAnswersMarkdown([])).toBe("");
  });
});
