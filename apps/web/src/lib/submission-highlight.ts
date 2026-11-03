import { createLowlight } from "lowlight";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

const lowlight = createLowlight({
  bash,
  css,
  javascript,
  json,
  markdown,
  python,
  sql,
  typescript,
  xml,
  yaml,
});
const LANGUAGES: Record<string, string> = {
  html: "xml",
  htm: "xml",
  svg: "xml",
  xml: "xml",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  css: "css",
  json: "json",
  py: "python",
  sql: "sql",
  sh: "bash",
  bash: "bash",
  yml: "yaml",
  yaml: "yaml",
  md: "markdown",
  markdown: "markdown",
};
export const MAX_HIGHLIGHT_CHARS = 200_000;
export interface CodeSegment {
  text: string;
  className: string;
}
type HighlightNode = ReturnType<typeof lowlight.highlight>["children"][number];

export function submissionLanguage(filename: string, fallback?: string): string | undefined {
  const extension = filename.split(".").at(-1)?.toLowerCase() ?? "";
  return (
    LANGUAGES[extension] ??
    (fallback
      ? (LANGUAGES[fallback.toLowerCase()] ??
        (lowlight.registered(fallback) ? fallback : undefined))
      : undefined)
  );
}

/** ファイル全体を解析してから行に分け、複数行コメントやタグの色を保つ。HTML は挿入しない。 */
export function highlightSubmission(
  code: string,
  filename: string,
  fallback?: string,
): CodeSegment[][] {
  const language = submissionLanguage(filename, fallback);
  const plain = () => code.split("\n").map((text) => [{ text, className: "" }]);
  if (!language || code.length > MAX_HIGHLIGHT_CHARS) return plain();
  try {
    const lines: CodeSegment[][] = [[]];
    const visit = (node: HighlightNode, inherited: string): void => {
      if (node.type === "text") {
        const parts = node.value.split("\n");
        for (const [index, text] of parts.entries()) {
          if (index > 0) lines.push([]);
          if (text) lines[lines.length - 1]?.push({ text, className: inherited });
        }
      } else if (node.type === "element") {
        const classes = Array.isArray(node.properties.className)
          ? node.properties.className.join(" ")
          : "";
        const scope = [inherited, classes].filter(Boolean).join(" ");
        for (const child of node.children) visit(child, scope);
      }
    };
    for (const child of lowlight.highlight(language, code).children) visit(child, "");
    return lines;
  } catch {
    return plain();
  }
}
