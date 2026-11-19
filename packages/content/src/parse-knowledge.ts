import { readFrontMatterField } from "./source-references.js";
import type { QuizQuestionSeed } from "./types.js";

export function readKnowledgeMetadata(source: string): {
  title?: string;
  durationMinutes?: number;
} {
  const title = readFrontMatterField(source, "title")
    ?.replace(/^(['"])(.*)\1$/, "$2")
    .trim();
  if (title === "") throw new Error("knowledge.md の title にクイズの表示名を指定してください");
  const minutes = readFrontMatterField(source, "durationMinutes");
  if (minutes === undefined) return { title };
  if (!/^[1-9]\d*$/.test(minutes) || !Number.isSafeInteger(Number(minutes)))
    throw new Error("knowledge.md の durationMinutes は正の整数で指定してください");
  return { title, durationMinutes: Number(minutes) };
}

/** knowledge.md: 各設問に種別とスキルを明示する。旧 practice.md の parser は変えない。 */
export function parseKnowledge(source: string): QuizQuestionSeed[] {
  const blocks = source.replace(/\r\n/g, "\n").split(/^### /m).slice(1);
  if (blocks.length === 0) throw new Error("knowledge.md: 設問が必要です");
  const seen = new Set<string>();
  return blocks.map((block, index) => {
    const prompt = /^Q(\d+)\.[ \t]*(.+)$/m.exec(block);
    if (prompt?.index !== 0 || !prompt[2].trim())
      throw new Error(`knowledge.md: 設問の見出しを確認してください: ${block.slice(0, 50)}`);
    const question = `knowledge.md: Q${prompt[1]}`;
    const content = block.slice(prompt[0].length);
    const details = /^<details\b[^>]*>/im.exec(content);
    if (!details) throw new Error(`${question} の解答を <details> に書いてください`);
    const beforeDetails = content.slice(0, details.index);
    const rows = [...beforeDetails.matchAll(/^- ([A-Z])\. ([^\n]+)$/gm)];
    const first = rows[0];
    const last = rows.at(-1);
    if (!first || !last) throw new Error(`${question} の選択肢は <details> より前に書いてください`);
    if (beforeDetails.slice(last.index + last[0].length).trim())
      throw new Error(`${question} の選択肢と <details> の間に文を書かないでください`);
    const bodySource = beforeDetails.slice(0, first.index);
    const meta =
      /^[ \t]*<!--[ \t]*kind:[ \t]*(single|multiple|boolean);[ \t]*skills:[ \t]*([^>\n]+?)[ \t]*-->[ \t]*$/m.exec(
        bodySource,
      );
    const afterDetails = content.slice(details.index + details[0].length);
    const detailsEnd = /^<\/details[ \t]*>/im.exec(afterDetails);
    const answer =
      detailsEnd &&
      /\*\*([A-Z](?:\s*,\s*[A-Z])*)\*\*\s*—\s*([\s\S]*)/.exec(
        afterDetails.slice(0, detailsEnd.index),
      );
    if (!meta || !answer?.[2].trim() || !detailsEnd)
      throw new Error(`${question} の種別・スキル・解説を確認してください`);
    if (
      index < blocks.length - 1 &&
      afterDetails.slice(detailsEnd.index + detailsEnd[0].length).trim()
    )
      throw new Error(`${question} の解答と次の設問の間に文を書かないでください`);
    if (seen.has(prompt[1])) throw new Error(`knowledge.md: Q${prompt[1]} が重複しています`);
    seen.add(prompt[1]);
    const skills = meta[2].split(",").map((v) => v.trim());
    if (skills.some((v) => !v) || new Set(skills).size !== skills.length)
      throw new Error("knowledge.md: スキルが不正です");
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
      body: bodySource.replace(meta[0], "").trim(),
      explanation: answer[2].trim(),
      options: rows.map((r) => ({ label: r[2].trim(), isCorrect: correct.includes(r[1]) })),
    };
  });
}
