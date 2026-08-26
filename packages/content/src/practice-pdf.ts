/**
 * practice.md を配布 PDF 用に「前半 = 問題編 / 後半 = 解答編」へ再構成する
 * (docs/superpowers/specs/2026-08-26-material-pdf-auto-conversion-design.md)。
 *
 * practice.md の定型 (parse-quiz.ts と同じ前提):
 *   # レッスンn-n 演習 — タイトル
 *   ## ハンズオン / ## 演習問題 / ## 解答例と解説 (<details> で 1 問ずつ) / ## 確認クイズ
 *
 * - 問題編: 冒頭 + 解答例と解説「以外」の節。確認クイズは <details>(答え) を落とす。
 * - 解答編: 解答例と解説 (<details> を見出しに展開) + 確認クイズの解答 (parseQuiz の
 *   構造から組み立てる — 正解ラベルと解説)。
 *
 * <details> の除去・展開はコードフェンス外にだけ掛ける (フェンス内の例示を壊さない)。
 */

import type { QuizQuestionSeed } from "./types.js";

const ANSWER_HEADING = "解答例と解説";

interface Section {
  /** `## ` 見出しのテキスト。冒頭ブロックは null。 */
  heading: string | null;
  /** 見出し行を含む本文 (冒頭ブロックは本文のみ)。 */
  body: string;
}

/** `## ` 見出しで節に割る。コードフェンス内の `## ` は見出しとして扱わない。 */
export function splitSections(source: string): Section[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const sections: Section[] = [];
  let current: Section = { heading: null, body: "" };
  let inFence = false;
  for (const line of lines) {
    if (/^(```|~~~)/.test(line)) inFence = !inFence;
    const m = !inFence && /^## (.+)$/.exec(line);
    if (m) {
      sections.push(current);
      current = { heading: m[1].trim(), body: "" };
    }
    current.body += `${line}\n`;
  }
  sections.push(current);
  return sections.filter((s) => s.heading !== null || s.body.trim() !== "");
}

/**
 * 行ベースで <details> を処理する。フェンス「外」の <details> / </details> だけを
 * タグとして扱う (フェンス内の例示コードは触らない)。details の中にコードフェンスが
 * あってもよい — 開始タグを見つけたら、対応する終了タグまでを 1 ブロックとして扱う。
 */
function transformDetails(source: string, mode: "drop" | "unwrap"): string {
  const out: string[] = [];
  let inFence = false;
  let inDetails = false;
  for (const line of source.replace(/\r\n/g, "\n").split("\n")) {
    if (/^(```|~~~)/.test(line)) {
      inFence = !inFence;
      if (!inDetails || mode === "unwrap") out.push(line);
      continue;
    }
    if (!inFence && !inDetails && /^\s*<details>\s*$/.test(line)) {
      inDetails = true;
      continue;
    }
    if (!inFence && inDetails && /^\s*<\/details>\s*$/.test(line)) {
      inDetails = false;
      continue;
    }
    if (inDetails && mode === "drop") continue;
    if (inDetails && mode === "unwrap") {
      const summary = /^\s*<summary>([\s\S]*?)<\/summary>\s*$/.exec(line);
      out.push(summary ? `#### ${summary[1].trim()}` : line);
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

/** <details>...</details> をまるごと落とす (問題編のクイズから答えを消す)。 */
export function dropDetails(source: string): string {
  return transformDetails(source, "drop");
}

/**
 * フェンス外の <details> ブロックを展開済み markdown として抜き出す。
 * ハンズオン等に置かれた解答 details を、問題編から落とすだけでなく
 * 解答編へ回収するために使う (fe-kamoku-a などが該当)。
 */
export function extractDetails(source: string): string[] {
  const blocks: string[] = [];
  let inFence = false;
  let current: string[] | null = null;
  for (const line of source.replace(/\r\n/g, "\n").split("\n")) {
    if (/^(```|~~~)/.test(line)) {
      inFence = !inFence;
      if (current) current.push(line);
      continue;
    }
    if (!inFence && !current && /^\s*<details>\s*$/.test(line)) {
      current = [];
      continue;
    }
    if (!inFence && current && /^\s*<\/details>\s*$/.test(line)) {
      blocks.push(current.join("\n").trim());
      current = null;
      continue;
    }
    if (current) {
      const summary = /^\s*<summary>([\s\S]*?)<\/summary>\s*$/.exec(line);
      current.push(summary ? `#### ${summary[1].trim()}` : line);
    }
  }
  return blocks.filter((b) => b !== "");
}

/** <details><summary>x</summary>…</details> を「#### x」+ 本文に展開する (解答編)。 */
export function unwrapDetails(source: string): string {
  return transformDetails(source, "unwrap");
}

/** 確認クイズの解答節を parseQuiz の構造から組み立てる。 */
export function quizAnswersMarkdown(questions: QuizQuestionSeed[]): string {
  if (questions.length === 0) return "";
  const parts = ["## 確認クイズの解答"];
  questions.forEach((q, i) => {
    const index = q.options.findIndex((o) => o.isCorrect);
    const letter = String.fromCharCode(65 + index); // A, B, C...
    parts.push(`### Q${i + 1}. ${q.prompt}`);
    parts.push(`**正解: ${letter}.** ${q.options[index]?.label ?? ""}`);
    if (q.explanation) parts.push(q.explanation);
  });
  return `${parts.join("\n\n")}\n`;
}

export interface PracticePdfParts {
  /** 前半 — 冒頭 + 問題 (答えなし)。 */
  problems: string;
  /** 後半 — 解答例と解説 + 確認クイズの解答。空なら解答編ページ自体を作らない。 */
  answers: string;
}

const QUIZ_HEADING = "確認クイズ";

export function splitPracticeForPdf(
  source: string,
  questions: QuizQuestionSeed[],
): PracticePdfParts {
  const sections = splitSections(source);
  const problems = sections
    .filter((s) => s.heading !== ANSWER_HEADING)
    .map((s) => dropDetails(s.body))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
  const answerSection = sections.find((s) => s.heading === ANSWER_HEADING);
  // ハンズオン等に埋まっていた解答 details は落としっぱなしにせず解答編へ回収する。
  // 確認クイズの details は quizAnswersMarkdown が復元するので対象外。
  const salvaged = sections
    .filter((s) => s.heading !== ANSWER_HEADING && s.heading !== QUIZ_HEADING)
    .flatMap((s) => extractDetails(s.body));
  const answers = [
    answerSection ? unwrapDetails(answerSection.body) : "",
    salvaged.length > 0 ? `## 演習内のヒント・解答\n\n${salvaged.join("\n\n")}` : "",
    quizAnswersMarkdown(questions),
  ]
    .filter((s) => s.trim() !== "")
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n");
  return { problems: problems.trim(), answers: answers.trim() };
}
