import { describe, expect, it } from "vitest";
import { parseKnowledge, readKnowledgeMetadata } from "./parse-knowledge.js";

const question = (kind: string, answer: string, options = "- A. 正しい\n- B. 誤り") =>
  `## 知識問題\n\n### Q1. 保存しますか？\n<!-- kind: ${kind}; skills: preview-changes -->\n${options}\n<details>\n<summary>解答</summary>\n\n**${answer}** — 保存してから表示を確認します。\n\n</details>`;
describe("knowledge.md", () => {
  it("単一選択・複数選択・正誤とスキルを読み込む", () => {
    expect(parseKnowledge(question("single", "A"))[0]).toMatchObject({
      kind: "single",
      skills: ["preview-changes"],
    });
    expect(
      parseKnowledge(question("multiple", "A, B"))[0].options.filter((o) => o.isCorrect),
    ).toHaveLength(2);
    expect(parseKnowledge(question("boolean", "B"))[0]).toMatchObject({ kind: "boolean" });
  });
  it("見出しと選択肢の間のコードを本文として読み込み、種別のコメントは除く", () => {
    const code = ["```ts", "const total = 1200 + 500;", "```"].join("\n");
    const source = question("single", "A").replace("- A.", `\n${code}\n\n- A.`);
    expect(parseKnowledge(source)[0]).toMatchObject({ prompt: "保存しますか？", body: code });
  });
  it("本文のない設問は空文字にする", () => {
    expect(parseKnowledge(question("single", "A"))[0].body).toBe("");
  });
  it("本文・選択肢・解説のコードにある details タグを解答の区切りにしない", () => {
    const code = ["```ts", 'const html = "<details>";', "```"].join("\n");
    const label = "`<details>` 要素";
    const explanation = "`</details>` で要素を閉じます。";
    const source = question("single", "A", `${code}\n\n- A. ${label}\n- B. その他`).replace(
      "保存してから表示を確認します。",
      explanation,
    );
    expect(parseKnowledge(source)[0]).toMatchObject({
      body: code,
      explanation,
      options: [
        { label, isCorrect: true },
        { label: "その他", isCorrect: false },
      ],
    });
  });
  it("選択肢より前の解答を拒否する", () => {
    const source = question("single", "A").replace("- A.", "<details open>\n- A.");
    expect(() => parseKnowledge(source)).toThrow(/Q1 の選択肢は <details> より前/);
  });
  it("選択肢と解答の間の文を拒否する", () => {
    const source = question("single", "A").replace("<details>", "補足の文\n\n<details>");
    expect(() => parseKnowledge(source)).toThrow(/Q1 の選択肢と <details> の間/);
  });
  it("途中の解答と次の設問の間の文を拒否する", () => {
    const next = question("single", "B").replace("Q1.", "Q2.").slice("## 知識問題\n\n".length);
    const source = `${question("single", "A")}\n\n補足の文\n\n${next}`;
    expect(() => parseKnowledge(source)).toThrow(/Q1 の解答と次の設問の間/);
  });
  it("最後の解答のあとに参考情報を書ける", () => {
    const source = question("single", "A");
    expect(parseKnowledge(`${source}\n\n参考: [資料](https://example.com)\n`)).toEqual(
      parseKnowledge(source),
    );
  });
  it.each([
    question("single", "A, B"),
    question("multiple", "C"),
    question("single", "A").replace("preview-changes", ""),
    question("boolean", "A", "- A. はい\n- B. いいえ"),
    question("single", "A").replace("**A**", "**A, A**"),
  ])("不正な種別・選択肢・正解・スキルは投入しない", (source) => {
    expect(() => parseKnowledge(source)).toThrow();
  });
});
describe("knowledge.md の表示", () => {
  it.each(["0", "-5", "1.5", "120分", "9007199254740992"])(
    "無効な所要時間 %s は拒否する",
    (minutes) => {
      expect(() => readKnowledgeMetadata(`---\ndurationMinutes: ${minutes}\n---\n本文`)).toThrow(
        "durationMinutes",
      );
    },
  );
  it("空の題ではまとめを省略できない", () => {
    expect(() => readKnowledgeMetadata('---\ntitle: ""\n---\n本文')).toThrow("title");
  });
});
