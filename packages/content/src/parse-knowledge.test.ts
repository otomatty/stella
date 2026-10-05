import { describe, expect, it } from "vitest";
import { parseKnowledge } from "./parse-knowledge.js";

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
