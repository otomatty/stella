/**
 * practice.md の「## 確認クイズ」節を QuizQuestionSeed[] に変換する。
 *
 * 全 42 レッスンが同一書式で書かれている前提。書式から外れた入力は
 * 黙って捨てず throw する（seed に穴が空くより、ビルドで気づきたい）。
 */

import type { QuizOptionSeed, QuizQuestionSeed } from "./types.js";

const QUIZ_HEADING = "## 確認クイズ";

export function parseQuiz(source: string): QuizQuestionSeed[] {
  const normalized = source.replace(/\r\n/g, "\n");
  const start = normalized.indexOf(QUIZ_HEADING);
  if (start === -1) return [];

  const after = normalized.slice(start + QUIZ_HEADING.length);
  const nextH2 = after.search(/\n## /);
  const section = nextH2 === -1 ? after : after.slice(0, nextH2);

  const blocks = section.split(/\n### /).slice(1);
  return blocks.map((block) => parseBlock(`### ${block}`));
}

function parseBlock(block: string): QuizQuestionSeed {
  const promptMatch = /^###\s*Q\d+\.\s*(.+)$/m.exec(block);
  if (!promptMatch) throw new Error(`設問見出しが読めません: ${block.slice(0, 40)}`);

  const options: QuizOptionSeed[] = [];
  const labels: string[] = [];
  for (const m of block.matchAll(/^-\s+([A-Z])\.\s+(.+)$/gm)) {
    labels.push(m[1]);
    options.push({ label: m[2].trim(), isCorrect: false });
  }
  if (options.length < 2) throw new Error(`選択肢が足りません: ${promptMatch[1]}`);

  const answerMatch = /\*\*([A-Z])\*\*\s*—\s*([\s\S]*?)\n\n<\/details>/.exec(block);
  if (!answerMatch) throw new Error(`解答ブロックが読めません: ${promptMatch[1]}`);

  const index = labels.indexOf(answerMatch[1]);
  if (index === -1) {
    throw new Error(`正解ラベル ${answerMatch[1]} が選択肢にありません: ${promptMatch[1]}`);
  }
  options[index].isCorrect = true;

  return {
    prompt: promptMatch[1].trim(),
    explanation: answerMatch[2].trim(),
    options,
  };
}
