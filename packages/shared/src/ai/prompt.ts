/**
 * AI チャットのプロンプト構築ユーティリティ。
 *
 * - `buildSystemPrompt`  … モデルに渡す system プロンプト (固定の日本語文字列)。
 * - `buildContextUserMessage` … 初回投稿時にクライアントが組み立てる、
 *   問題情報・提出コード・失敗チェックを含む最初の user メッセージ本文。
 *
 * いずれも純粋関数。テスト容易性のため Anthropic SDK へは依存しない。
 */

import type { Assignment } from "../types.js";
import type { GradingSummary } from "./types.js";

export function buildSystemPrompt(): string {
  return [
    "あなたは JavaScript 学習者をサポートするチューターです。",
    "学習者は提示された課題を解いていて、何らかの理由で失敗しています。",
    "",
    "回答方針:",
    "- 失敗している原因を 1 つに絞って、まずヒントだけを返してください。",
    "- 完成形のコード全体を初手で出すのは避けてください。",
    "- どの行・どの構文が問題かを具体的に指摘してください。",
    "- 次に試す具体的な 1 ステップを提案してください。",
    "- 学習者が同じ質問を 2 度以上繰り返した場合に限り、模範解答を示してよいです。",
    "- 日本語で、やさしい言葉で簡潔に答えてください (Markdown 可)。",
  ].join("\n");
}

/**
 * 初回ターンの user メッセージ本文。
 *
 * サーバを assignment データに依存させないため、クライアントが
 * すべての文脈をこの 1 通の Markdown メッセージに圧縮して送る。
 * 後続のターンは通常の追加質問として扱う。
 */
export function buildContextUserMessage(
  assignment: Assignment,
  userCode: string,
  summary: GradingSummary,
): string {
  const sections: string[] = [];

  sections.push(`## 問題: ${assignment.title}`);
  sections.push(assignment.description.trim());

  sections.push("## 提出したコード");
  sections.push("```js");
  sections.push(userCode.trimEnd());
  sections.push("```");

  sections.push("## 失敗しているチェック");
  const bullets = formatFailures(summary);
  if (bullets.length === 0) {
    sections.push(
      "- (採点結果から具体的な失敗箇所は取得できませんでした。コードを見て一般的なヒントをください。)",
    );
  } else {
    sections.push(bullets.map((b) => `- ${b}`).join("\n"));
  }

  sections.push(
    "この失敗の原因を 1 つだけ、ヒントとして教えてください。完成コードは出さないでください。",
  );

  return sections.join("\n\n");
}

function formatFailures(summary: GradingSummary): string[] {
  const out: string[] = [];

  for (const v of summary.lintFailures) {
    const rule = v.ruleId ? ` (${v.ruleId})` : "";
    out.push(`Lint ${v.line}行目${rule}: ${v.message}`);
  }

  for (const a of summary.astFailures) {
    const where = a.line ? ` (${a.line}行目)` : "";
    if (a.kind === "required-missing") {
      out.push(`必須の書き方が見つからない: ${a.label}${where}`);
    } else {
      out.push(`使ってはいけない書き方が検出された: ${a.label}${where}`);
    }
  }

  for (const t of summary.testFailures) {
    if (t.error) {
      out.push(`テスト失敗 "${t.name}": ${t.error}`);
    } else if (
      t.expectedStdout !== undefined &&
      t.actualStdout !== undefined
    ) {
      out.push(
        `テスト失敗 "${t.name}": 期待 \`${oneLine(t.expectedStdout)}\` / 実際 \`${oneLine(t.actualStdout)}\``,
      );
    } else {
      out.push(`テスト失敗 "${t.name}"`);
    }
  }

  return out;
}

function oneLine(s: string): string {
  const trimmed = s.replace(/\s+/g, " ").trim();
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
}
