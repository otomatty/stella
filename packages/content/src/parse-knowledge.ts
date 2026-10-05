import type { QuizQuestionSeed } from "./types.js";

/** knowledge.md: 各設問に種別とスキルを明示する。旧 practice.md の parser は変えない。 */
export function parseKnowledge(source: string): QuizQuestionSeed[] {
  const blocks = source.replace(/\r\n/g, "\n").split(/^### /m).slice(1);
  if (blocks.length === 0) throw new Error("knowledge.md: 設問が必要です");
  const seen = new Set<string>();
  return blocks.map((block) => {
    const prompt = /^Q(\d+)\.\s*(.+)$/m.exec(block);
    const meta = /<!--\s*kind:\s*(single|multiple|boolean);\s*skills:\s*([^>]+?)\s*-->/.exec(block);
    const answer = /\*\*([A-Z](?:\s*,\s*[A-Z])*)\*\*\s*—\s*([\s\S]*?)\n\s*<\/details>/.exec(block);
    if (!prompt || !meta || !answer?.[2].trim())
      throw new Error(
        `knowledge.md: 設問・種別・スキル・解説を確認してください: ${block.slice(0, 50)}`,
      );
    if (seen.has(prompt[1])) throw new Error(`knowledge.md: Q${prompt[1]} が重複しています`);
    seen.add(prompt[1]);
    const skills = meta[2].split(",").map((v) => v.trim());
    if (skills.some((v) => !v) || new Set(skills).size !== skills.length)
      throw new Error("knowledge.md: スキルが不正です");
    const rows = [...block.matchAll(/^-\s+([A-Z])\.\s+(.+)$/gm)];
    const labels = rows.map((r) => r[1]);
    const correct = answer[1].split(",").map((s) => s.trim());
    const kind = meta[1] as NonNullable<QuizQuestionSeed["kind"]>;
    if (
      rows.length < 2 ||
      new Set(labels).size !== labels.length ||
      new Set(correct).size !== correct.length ||
      correct.some((v) => !labels.includes(v))
    )
      throw new Error("knowledge.md: 選択肢と正解が一致しません");
    if (kind !== "multiple" && correct.length !== 1)
      throw new Error("単一選択・正誤には正解を1つ書いてください");
    if (
      kind === "boolean" &&
      (rows.length !== 2 || rows[0][2].trim() !== "正しい" || rows[1][2].trim() !== "誤り")
    )
      throw new Error("正誤の選択肢は A. 正しい / B. 誤り にしてください");
    return {
      kind,
      skills,
      prompt: prompt[2].trim(),
      explanation: answer[2].trim(),
      options: rows.map((r) => ({ label: r[2].trim(), isCorrect: correct.includes(r[1]) })),
    };
  });
}
