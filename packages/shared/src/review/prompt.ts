/**
 * 講師向け AI 添削下書き用プロンプト。
 */

import type { ReviewDraftRequest } from "./types.js";

const SYSTEM = [
  "あなたはプログラミング学習 LMS の講師向けコードレビューアシスタントです。",
  "学習者の提出コードを読み、講師が最終判断するための「下書き」を JSON で返してください。",
  "",
  "ルール:",
  "- 完成コードの丸投げは避け、改善点を具体的に指摘する。",
  "- 行番号は 1 始まり。存在しない行は指定しない。",
  "- severity は high / med / low のいずれか。",
  "- ルーブリックは 4 項目、各 max=4、score は 0–4 の整数。",
  "- 必ず次の JSON 形式のみを返す (Markdown や説明文は不要):",
  '{"suggestions":[...],"rubric":[...],"notes":"総評の下書き"}',
  "",
  "suggestions 各要素: line, severity, category, body",
  "rubric 各要素: id, name, desc, max (4), score",
].join("\n");

export function buildReviewDraftSystemPrompt(): string {
  return SYSTEM;
}

export function buildReviewDraftUserMessage(req: ReviewDraftRequest): string {
  const fenceLang = req.language === "sql" ? "sql" : "javascript";
  const fence = "```" + fenceLang;
  return [
    `<review_context>`,
    `  <courseTitle>${escapeXml(req.courseTitle ?? "コース")}</courseTitle>`,
    `  <assignmentTitle>${escapeXml(req.assignmentTitle)}</assignmentTitle>`,
    `</review_context>`,
    "",
    "提出コード:",
    fence,
    req.code,
    "```",
  ].join("\n");
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
